import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AccountTokenPurpose } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * One-time links for customer accounts (verify email, reset password). The
 * raw token only ever lives in the email; the database keeps its SHA-256.
 */
@Injectable()
export class AccountTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /** A new token for this purpose; older unused ones stop working. */
  async issue(
    userId: string,
    purpose: AccountTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.prisma.$transaction([
      this.prisma.accountToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.accountToken.create({
        data: {
          userId,
          purpose,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      }),
    ]);
    return token;
  }

  /** The token's user id if it would work now, without using it up. */
  async peek(
    token: string,
    purpose: AccountTokenPurpose,
  ): Promise<string | null> {
    const record = await this.prisma.accountToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { userId: true, purpose: true, usedAt: true, expiresAt: true },
    });
    if (!record || record.purpose !== purpose || record.usedAt) return null;
    return record.expiresAt.getTime() > Date.now() ? record.userId : null;
  }

  /**
   * Uses up a token and returns its user id, or null when it is unknown,
   * used, expired or for something else. The conditional update means two
   * clicks at once cannot both succeed.
   */
  async consume(
    token: string,
    purpose: AccountTokenPurpose,
  ): Promise<string | null> {
    const record = await this.prisma.accountToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, purpose: true },
    });
    if (!record || record.purpose !== purpose) return null;
    const { count } = await this.prisma.accountToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return count === 1 ? record.userId : null;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
