import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verify as verifyPassword } from "@node-rs/argon2";
import { generateSecret, generateURI, verify } from "otplib";
import type { Env } from "../../config/env.schema.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { TokenService } from "./token.service.js";
import {
  decryptSecret,
  deriveKey,
  encryptSecret,
  hashBackupCode,
  newBackupCode,
} from "./totp-crypto.js";

const BACKUP_CODES = 10;
const ISSUER = "Aaarchive";

export type TotpUser = {
  id: string;
  totpSecret: string | null;
  totpLastStep: number | null;
  totpBackupCodes: string[];
};

/**
 * Two-factor sign-in with an authenticator app (TOTP, RFC 6238; rules.md
 * §8.2). Keys are encrypted at rest; each code works once (last time step
 * is stored); 10 one-time backup codes are shown once and stored hashed.
 */
@Injectable()
export class TotpService {
  private readonly logger = new Logger("Security");
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    config: ConfigService<Env, true>,
  ) {
    // Production refuses to start without TOTP_ENCRYPTION_KEY (env.schema.ts).
    this.key = deriveKey(
      config.get("TOTP_ENCRYPTION_KEY", { infer: true }) ??
        `dev:${config.get("JWT_ACCESS_SECRET", { infer: true })}`,
    );
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpEnabledAt: true, totpBackupCodes: true },
    });
    return {
      enabled: Boolean(user.totpEnabledAt),
      backupCodesLeft: user.totpEnabledAt ? user.totpBackupCodes.length : 0,
    };
  }

  /** Starts setup: a new key, kept as pending until a code confirms it. */
  async setup(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, totpEnabledAt: true },
    });
    if (user.totpEnabledAt) throw alreadyOn();
    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpPendingSecret: encryptSecret(secret, this.key) },
    });
    return {
      secret,
      uri: generateURI({ issuer: ISSUER, label: user.email ?? userId, secret }),
    };
  }

  /** Confirms setup with a first code; returns the backup codes (shown once). */
  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpPendingSecret: true, totpEnabledAt: true },
    });
    if (user.totpEnabledAt) throw alreadyOn();
    if (!user.totpPendingSecret) {
      throw new BadRequestException({
        message: "Start the setup again",
        code: "TOTP_SETUP_MISSING",
      });
    }
    const secret = decryptSecret(user.totpPendingSecret, this.key);
    const step = await this.verifyCode(secret, code, null);
    if (step === null) throw invalidCode();
    const codes = Array.from({ length: BACKUP_CODES }, newBackupCode);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: user.totpPendingSecret,
        totpPendingSecret: null,
        totpEnabledAt: new Date(),
        totpLastStep: step,
        totpBackupCodes: codes.map(hashBackupCode),
      },
    });
    this.logger.log(`Two-factor sign-in turned on for user ${userId}`);
    return { backupCodes: codes };
  }

  /** Turning it off needs the password and a current code. */
  async disable(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        totpSecret: true,
        totpLastStep: true,
        totpBackupCodes: true,
      },
    });
    const passwordOk = user.passwordHash
      ? await verifyPassword(user.passwordHash, password).catch(() => false)
      : false;
    if (!passwordOk) {
      throw new UnauthorizedException({
        message: "Your current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }
    if (!(await this.consume(user, code))) throw invalidCode();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpPendingSecret: null,
        totpEnabledAt: null,
        totpLastStep: null,
        totpBackupCodes: [],
        tokenVersion: { increment: 1 },
      },
    });
    // Other devices signed in with two-factor are signed out.
    await this.tokens.revokeAllForUser(userId);
    this.logger.log(`Two-factor sign-in turned off for user ${userId}`);
  }

  /**
   * Checks a sign-in code: an authenticator code newer than the last one
   * used, or an unused backup code (which is then spent). True when valid.
   */
  async consume(user: TotpUser, code: string): Promise<boolean> {
    if (!user.totpSecret) return false;
    if (/^\d{6}$/.test(code)) {
      const step = await this.verifyCode(
        decryptSecret(user.totpSecret, this.key),
        code,
        user.totpLastStep,
      );
      if (step === null) return false;
      // Conditional: two requests with the same code cannot both pass.
      const { count } = await this.prisma.user.updateMany({
        where: {
          id: user.id,
          OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
        },
        data: { totpLastStep: step },
      });
      return count === 1;
    }
    const hashed = hashBackupCode(code);
    if (!user.totpBackupCodes.includes(hashed)) return false;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        totpBackupCodes: user.totpBackupCodes.filter((h) => h !== hashed),
      },
    });
    this.logger.warn(`Backup code used by user ${user.id}`);
    return true;
  }

  /** The time step of a valid code (±30 s for clock drift), else null. */
  private async verifyCode(
    secret: string,
    code: string,
    lastStep: number | null,
  ): Promise<number | null> {
    if (!/^\d{6}$/.test(code)) return null;
    const result = await verify({
      secret,
      token: code,
      epochTolerance: 30,
      ...(lastStep !== null ? { afterTimeStep: lastStep } : {}),
    });
    return result.valid && "timeStep" in result
      ? Number(result.timeStep)
      : null;
  }
}

function invalidCode() {
  return new UnauthorizedException({
    message: "That code is not right. Try the newest code from your app.",
    code: "INVALID_TOTP_CODE",
  });
}

function alreadyOn() {
  return new ConflictException({
    message: "Two-factor sign-in is already on",
    code: "TOTP_ALREADY_ON",
  });
}
