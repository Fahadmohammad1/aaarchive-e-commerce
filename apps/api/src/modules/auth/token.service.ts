import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AccessTokenPayload } from "../../common/auth/request-user.js";
import type { Env } from "../../config/env.schema.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { REFRESH_REUSE_GRACE_MS } from "./auth.constants.js";

export type IssuedRefresh = {
  token: string;
  familyId: string;
  maxAgeMs: number;
};

export type RotateResult =
  | { ok: true; userId: string; refresh: IssuedRefresh }
  | { ok: false; reason: "unknown" | "expired" | "revoked" | "reused" };

/** Access tokens (JWT) and rotating refresh tokens (rules.md §8.2). */
@Injectable()
export class TokenService {
  private readonly logger = new Logger("Security");
  private readonly refreshTtlMs: number;
  readonly accessTtlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtlSeconds = config.get("ACCESS_TOKEN_TTL_SECONDS", {
      infer: true,
    });
    this.refreshTtlMs =
      config.get("REFRESH_TOKEN_TTL_DAYS", { infer: true }) * 86_400_000;
  }

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  /** Starts a new session (refresh-token family) for a user. */
  async createSession(
    userId: string,
    userAgent?: string,
  ): Promise<IssuedRefresh> {
    return this.issue(userId, randomUUID(), userAgent);
  }

  /**
   * Exchanges a refresh token for a new one in the same family. A token that
   * was already replaced (outside a short grace window for two tabs refreshing
   * together) means it was stolen: the whole family is revoked.
   */
  async rotate(rawToken: string, userAgent?: string): Promise<RotateResult> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!record) return { ok: false, reason: "unknown" };
    if (record.revokedAt) return { ok: false, reason: "revoked" };

    const now = Date.now();
    if (
      record.replacedAt &&
      now - record.replacedAt.getTime() > REFRESH_REUSE_GRACE_MS
    ) {
      await this.revokeFamily(record.familyId);
      this.logger.warn(
        `Refresh token reuse detected for user ${record.userId}: session ${record.familyId} revoked`,
      );
      return { ok: false, reason: "reused" };
    }
    if (record.expiresAt.getTime() <= now)
      return { ok: false, reason: "expired" };

    const [, refresh] = await this.prisma.$transaction(async (tx) => {
      const marked = await tx.refreshToken.update({
        where: { id: record.id },
        data: { replacedAt: record.replacedAt ?? new Date(now) },
      });
      const issued = await this.issue(
        record.userId,
        record.familyId,
        userAgent,
        tx,
      );
      return [marked, issued] as const;
    });
    return { ok: true, userId: record.userId, refresh };
  }

  /** Ends one session (logout). */
  async revokeByToken(rawToken: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: { familyId: true },
    });
    if (record) await this.revokeFamily(record.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Ends every session of a user (logout everywhere, password change, deactivation). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(
    userId: string,
    familyId: string,
    userAgent: string | undefined,
    db: Pick<PrismaService, "refreshToken"> = this.prisma,
  ): Promise<IssuedRefresh> {
    const token = randomBytes(32).toString("base64url");
    await db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        userAgent: userAgent?.slice(0, 200),
      },
    });
    return { token, familyId, maxAgeMs: this.refreshTtlMs };
  }
}

/** Refresh tokens are 256 random bits, so a fast hash is enough to store them. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
