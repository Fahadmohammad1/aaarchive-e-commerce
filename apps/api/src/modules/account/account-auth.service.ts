import type {
  ForgotPasswordInput,
  RegisterInput,
} from "@aaarchive/shared/account";
import type { LoginInput } from "@aaarchive/shared/auth";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hash } from "@node-rs/argon2";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import type { Env } from "../../config/env.schema.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  AuthService,
  CUSTOMER_SCOPE,
  type SessionResult,
} from "../auth/auth.service.js";
import { checkNewPassword } from "../auth/password-policy.js";
import { TokenService } from "../auth/token.service.js";
import { MailService } from "../mail/mail.service.js";
import {
  RESET_PASSWORD_TTL_MS,
  VERIFY_EMAIL_TTL_MS,
} from "./account.constants.js";
import { resetPasswordMail, verifyEmailMail } from "./account-mail.js";
import { AccountTokensService } from "./account-tokens.service.js";
import type { GoogleIdentity } from "./google-oauth.service.js";

const SESSION_USER = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  tokenVersion: true,
  emailVerifiedAt: true,
} as const;

/**
 * Customer sign-up and sign-in (PRD §5.10). Sessions, lockout and password
 * rules are the dashboard's (AuthService), scoped to the CUSTOMER role.
 */
@Injectable()
export class AccountAuthService {
  private readonly logger = new Logger("Security");
  private readonly siteOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly accountTokens: AccountTokensService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.siteOrigin = new URL(
      config.get("FRONTEND_ORIGIN", { infer: true }),
    ).origin;
  }

  async register(
    input: RegisterInput & { email: string },
    userAgent?: string,
  ): Promise<SessionResult> {
    const problem = checkNewPassword(input.password, input.email);
    if (problem) {
      throw new BadRequestException({
        message: "Choose a stronger password",
        code: problem,
        details: { fieldErrors: { password: [problem] } },
      });
    }
    const user = await this.prisma.user
      .create({
        data: {
          name: input.name.trim(),
          email: input.email,
          passwordHash: await hash(input.password),
          role: "CUSTOMER",
        },
        select: SESSION_USER,
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) throw emailTaken();
        throw error;
      });
    this.logger.log(`Customer account created: ${user.id}`);
    void this.sendVerification(user.id);
    return this.auth.startSession(user, userAgent);
  }

  async login(input: LoginInput, userAgent?: string): Promise<SessionResult> {
    const result = await this.auth.login(input, userAgent, CUSTOMER_SCOPE);
    // Customers cannot turn two-factor on, so a challenge means a bad state.
    if ("mfa" in result) throw invalidCredentials();
    void this.linkOrdersByEmail(result.session.user.id);
    return result;
  }

  refresh(
    rawToken: string | undefined,
    userAgent?: string,
  ): Promise<SessionResult> {
    return this.auth.refresh(rawToken, userAgent, CUSTOMER_SCOPE);
  }

  logout(rawToken: string): Promise<void> {
    return this.auth.logout(rawToken);
  }

  /** Always succeeds from the outside, so it never reveals who has an account. */
  async forgotPassword(input: ForgotPasswordInput & { email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (user?.role !== "CUSTOMER" || !user.isActive || !user.email) {
      return;
    }
    const token = await this.accountTokens.issue(
      user.id,
      "RESET_PASSWORD",
      RESET_PASSWORD_TTL_MS,
    );
    // Not awaited: the answer must take as long with or without an account.
    void this.mail.send(
      resetPasswordMail(
        user.name,
        user.email,
        `${this.siteOrigin}/account/reset-password?token=${token}`,
      ),
      `password reset for ${user.id}`,
    );
  }

  /**
   * Sets a new password from an emailed link. Opening the link proves the
   * inbox, so the email counts as verified. Every session ends.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.accountTokens.peek(token, "RESET_PASSWORD");
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, role: true, isActive: true },
        })
      : null;
    if (user?.role !== "CUSTOMER" || !user.isActive) {
      throw invalidToken();
    }
    // Checked before the token is used up, so a weak password can be retried.
    const problem = checkNewPassword(password, user.email);
    if (problem) {
      throw new BadRequestException({
        message: "Choose a stronger password",
        code: problem,
        details: { fieldErrors: { password: [problem] } },
      });
    }
    if ((await this.accountTokens.consume(token, "RESET_PASSWORD")) !== user.id)
      throw invalidToken();

    const now = new Date();
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(password),
        emailVerifiedAt: current.emailVerifiedAt ?? now,
        tokenVersion: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.tokens.revokeAllForUser(user.id);
    this.logger.log(`Customer ${user.id} reset their password; sessions ended`);
    await this.linkOrdersByEmail(user.id);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.accountTokens.consume(token, "VERIFY_EMAIL");
    if (!userId) throw invalidToken();
    await this.prisma.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    await this.linkOrdersByEmail(userId);
  }

  /** Emails a confirmation link, unless the address is already confirmed. */
  async sendVerification(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, emailVerifiedAt: true },
      });
      if (!user?.email || user.emailVerifiedAt) return;
      const token = await this.accountTokens.issue(
        userId,
        "VERIFY_EMAIL",
        VERIFY_EMAIL_TTL_MS,
      );
      await this.mail.send(
        verifyEmailMail(
          user.name,
          user.email,
          `${this.siteOrigin}/account/verify-email?token=${token}`,
        ),
        `email verification for ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Verification email for ${userId} failed: ${String(error)}`,
      );
    }
  }

  /**
   * Google sign-in. Matches by Google id, then by (Google-verified) email.
   * Linking Google to an account whose email was never verified removes its
   * password and sessions: whoever set them may not own the inbox (account
   * pre-hijacking). Dashboard accounts never sign in this way.
   */
  async googleSignIn(
    identity: GoogleIdentity,
    userAgent?: string,
  ): Promise<SessionResult> {
    const byGoogle = await this.prisma.user.findUnique({
      where: { googleId: identity.sub },
      select: SESSION_USER,
    });
    let user = byGoogle;
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: identity.email },
        select: SESSION_USER,
      });
      if (byEmail) {
        if (byEmail.role !== "CUSTOMER") throw googleRefused();
        const takeOver = !byEmail.emailVerifiedAt;
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: identity.sub,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            ...(takeOver && {
              passwordHash: null,
              tokenVersion: { increment: 1 },
            }),
          },
          select: SESSION_USER,
        });
        if (takeOver) {
          await this.tokens.revokeAllForUser(byEmail.id);
          this.logger.warn(
            `Google linked to unverified account ${byEmail.id}: password and sessions removed`,
          );
        }
      } else {
        user = await this.prisma.user.create({
          data: {
            name: identity.name,
            email: identity.email,
            googleId: identity.sub,
            emailVerifiedAt: new Date(),
            role: "CUSTOMER",
          },
          select: SESSION_USER,
        });
        this.logger.log(`Customer account created with Google: ${user.id}`);
      }
    }
    if (user.role !== "CUSTOMER" || !user.isActive) throw googleRefused();
    await this.linkOrdersByEmail(user.id);
    return this.auth.startSession(user, userAgent);
  }

  /**
   * Guest orders placed with the account's email join the account — only
   * once that email is verified (PRD §5.10; rules.md §8.3).
   */
  async linkOrdersByEmail(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerifiedAt: true, role: true },
      });
      if (!user?.email || !user.emailVerifiedAt || user.role !== "CUSTOMER")
        return 0;
      const { count } = await this.prisma.order.updateMany({
        where: { userId: null, email: user.email },
        data: { userId },
      });
      if (count > 0)
        this.logger.log(`Linked ${count} guest order(s) to ${userId}`);
      return count;
    } catch (error) {
      this.logger.error(
        `Linking orders for ${userId} failed: ${String(error)}`,
      );
      return 0;
    }
  }
}

function emailTaken() {
  return new ConflictException({
    message: "An account with this email already exists",
    code: "EMAIL_TAKEN",
    details: { fieldErrors: { email: ["EMAIL_TAKEN"] } },
  });
}

function invalidCredentials() {
  return new UnauthorizedException({
    message: "Email or password is incorrect",
    code: "INVALID_CREDENTIALS",
  });
}

function invalidToken() {
  return new BadRequestException({
    message: "This link is invalid or has expired",
    code: "INVALID_TOKEN",
  });
}

function googleRefused() {
  return new UnauthorizedException({
    message: "This Google account cannot sign in here",
    code: "GOOGLE_SIGN_IN_FAILED",
  });
}
