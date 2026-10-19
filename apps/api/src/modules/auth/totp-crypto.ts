import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// Two-factor keys are encrypted at rest (AES-256-GCM): a database leak alone
// does not reveal them. The key comes from TOTP_ENCRYPTION_KEY.

const VERSION = "v1";

export function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(`aaarchive-totp:${secret}`).digest();
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    data.toString("base64"),
  ].join(":");
}

export function decryptSecret(stored: string, key: Buffer): string {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== VERSION || !iv || !tag || !data)
    throw new Error("Bad TOTP secret format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Backup codes are stored as SHA-256 hashes (they are random, so no salt needed). */
export function hashBackupCode(code: string): string {
  return createHash("sha256")
    .update(code.replace("-", "").toUpperCase())
    .digest("hex");
}

/** "AB12-CD34": 8 characters without look-alikes (no 0/O, 1/I/L). */
export function newBackupCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
