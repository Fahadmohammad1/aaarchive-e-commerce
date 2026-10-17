import type {
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  SessionResponse,
} from "@aaarchive/shared/auth";
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hash, verify } from "@node-rs/argon2";
import type { RequestUser } from "../../common/auth/request-user.js";
import type { Env } from "../../config/env.schema.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { checkNewPassword } from "./password-policy.js";
import { type IssuedRefresh, TokenService } from "./token.service.js";

type SessionResult = { session: SessionResponse; refresh: IssuedRefresh };

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  tokenVersion: true,
  passwordHash: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger("Security");
  private readonly maxAttempts: number;
  private readonly lockMs: number;
  /** Verified against when the account does not exist, so timing never reveals it. */
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    config: ConfigService<Env, true>,
  ) {
    this.maxAttempts = config.get("LOGIN_MAX_ATTEMPTS", { infer: true });
    this.lockMs = config.get("LOGIN_LOCK_MINUTES", { infer: true }) * 60_000;
    this.dummyHash = hash("timing-equaliser-not-a-real-password");
  }

  /** Same error for every failure: wrong email, wrong password, locked or inactive. */
  async login(input: LoginInput, userAgent?: string): Promise<SessionResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: USER_SELECT,
    });

    const now = Date.now();
    const locked = !!user?.lockedUntil && user.lockedUntil.getTime() > now;
    const storedHash =
      user?.isActive && !locked ? (user.passwordHash ?? null) : null;
    const usable = storedHash !== null;

    // Always run one argon2 verify, so response time never reveals whether the
    // account exists, is locked or has no password.
    const passwordOk = await verify(
      storedHash ?? (await this.dummyHash),
      input.password,
    ).catch(() => false);

    if (!user || !usable || !passwordOk) {
      if (user && usable)
        await this.recordFailure(user.id, user.failedLoginCount);
      else
        this.logger.warn(
          user
            ? `Login refused for user ${user.id} (locked or inactive)`
            : "Login failed for unknown account",
        );
      throw new UnauthorizedException({
        message: "Email or password is incorrect",
        code: "INVALID_CREDENTIALS",
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const refresh = await this.tokens.createSession(user.id, userAgent);
    return { session: await this.sessionFor(user, refresh.familyId), refresh };
  }

  /** Rotates the refresh token and returns a fresh access token. */
  async refresh(
    rawToken: string | undefined,
    userAgent?: string,
  ): Promise<SessionResult> {
    if (!rawToken) throw sessionExpired();
    const result = await this.tokens.rotate(rawToken, userAgent);
    if (!result.ok) throw sessionExpired();

    const user = await this.prisma.user.findUnique({
      where: { id: result.userId },
      select: USER_SELECT,
    });
    if (!user?.isActive) {
      await this.tokens.revokeFamily(result.refresh.familyId);
      throw sessionExpired();
    }
    return {
      session: await this.sessionFor(user, result.refresh.familyId),
      refresh: result.refresh,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await this.tokens.revokeByToken(rawToken);
  }

  /** Signs the user out on every device. */
  async logoutEverywhere(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.tokens.revokeAllForUser(userId);
    this.logger.log(`User ${userId} signed out everywhere`);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  /** Changes the password, ends every other session, and starts a new one here. */
  async changePassword(
    current: RequestUser,
    input: ChangePasswordInput,
    userAgent?: string,
  ): Promise<SessionResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: current.id },
      select: USER_SELECT,
    });
    const ok =
      user.passwordHash !== null &&
      (await verify(user.passwordHash, input.currentPassword).catch(
        () => false,
      ));
    if (!ok) {
      this.logger.warn(
        `Password change with wrong current password for user ${user.id}`,
      );
      throw new BadRequestException({
        message: "Your current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }
    const problem = checkNewPassword(input.newPassword, user.email);
    if (problem) {
      throw new BadRequestException({
        message: "Choose a stronger password",
        code: problem,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(input.newPassword),
        tokenVersion: { increment: 1 },
      },
      select: USER_SELECT,
    });
    await this.tokens.revokeAllForUser(user.id);
    this.logger.log(`User ${user.id} changed password; all sessions ended`);
    const refresh = await this.tokens.createSession(user.id, userAgent);
    return {
      session: await this.sessionFor(updated, refresh.familyId),
      refresh,
    };
  }

  private async recordFailure(
    userId: string,
    previousFailures: number,
  ): Promise<void> {
    const failures = previousFailures + 1;
    const lock = failures >= this.maxAttempts;
    await this.prisma.user.update({
      where: { id: userId },
      data: lock
        ? {
            failedLoginCount: 0,
            lockedUntil: new Date(Date.now() + this.lockMs),
          }
        : { failedLoginCount: failures },
    });
    this.logger.warn(
      lock
        ? `User ${userId} locked for ${this.lockMs / 60_000} min after ${failures} failed logins`
        : `Failed login for user ${userId} (${failures}/${this.maxAttempts})`,
    );
  }

  private async sessionFor(
    user: {
      id: string;
      name: string;
      email: string | null;
      role: AuthUser["role"];
      tokenVersion: number;
    },
    familyId: string,
  ): Promise<SessionResponse> {
    return {
      accessToken: await this.tokens.signAccessToken({
        sub: user.id,
        tv: user.tokenVersion,
        sid: familyId,
      }),
      expiresIn: this.tokens.accessTtlSeconds,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

function sessionExpired() {
  return new UnauthorizedException({
    message: "Your session has ended. Please sign in again",
    code: "SESSION_EXPIRED",
  });
}
