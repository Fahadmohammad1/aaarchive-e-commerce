import { z } from "zod";

// Auth request/response shapes shared by the dashboard and the API
// (rules.md §8.2). The common-password check runs on the API only.

export const STAFF_ROLES = ["OWNER", "STAFF"] as const;
export const ROLES = ["CUSTOMER", ...STAFF_ROLES] as const;
export type Role = (typeof ROLES)[number];

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** A new password: length rules only; the API adds the common-password check. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: "PASSWORD_TOO_SHORT" })
  .max(PASSWORD_MAX_LENGTH, { message: "PASSWORD_TOO_LONG" });

export const loginSchema = z.strictObject({
  email: emailSchema,
  // Not newPasswordSchema: an existing password is only checked, never judged.
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  /** Cloudflare Turnstile token from the login form. */
  turnstileToken: z.string().max(4096).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newPassword: newPasswordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "PASSWORD_UNCHANGED",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  role: z.enum(ROLES),
});
export type AuthUser = z.infer<typeof authUserSchema>;

/** Body of POST /auth/login and POST /auth/refresh. The refresh token is a cookie. */
export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
  user: authUserSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export function isStaffRole(role: Role): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

// ── Staff management (PRD §6.8, Owner only) ─────────────────────────────

const staffName = z
  .string()
  .trim()
  .min(2, { message: "TOO_SHORT" })
  .max(60, { message: "TOO_LONG" });

/** The Owner creates the account and shares the first password in person. */
export const staffCreateSchema = z.strictObject({
  name: staffName,
  email: emailSchema,
  role: z.enum(STAFF_ROLES),
  password: newPasswordSchema,
});
export type StaffCreateInput = z.input<typeof staffCreateSchema>;

export const staffUpdateSchema = z
  .strictObject({
    name: staffName,
    role: z.enum(STAFF_ROLES),
    /** false ends every session of that account at once. */
    isActive: z.boolean(),
    /** Set a new password (forgotten password); ends their sessions. */
    password: newPasswordSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "NOTHING_TO_CHANGE" });
export type StaffUpdateInput = z.input<typeof staffUpdateSchema>;

// ── Two-factor sign-in (TOTP, rules.md §8.2) ────────────────────────────

/** A 6-digit authenticator code, or a one-time backup code (XXXX-XXXX). */
export const totpCodeSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .pipe(
    z.string().regex(/^(\d{6}|[A-Z0-9]{4}-?[A-Z0-9]{4})$/, {
      message: "INVALID_CODE",
    }),
  );

/** Login answer when the account has two-factor on: no session yet. */
export const mfaChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  /** Short-lived (5 min) proof that the password step passed. */
  mfaToken: z.string(),
});
export type MfaChallenge = z.infer<typeof mfaChallengeSchema>;
export const loginResponseSchema = z.union([
  mfaChallengeSchema,
  sessionResponseSchema,
]);
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const totpLoginSchema = z.strictObject({
  mfaToken: z.string().min(1).max(2048),
  code: totpCodeSchema,
});
export type TotpLoginInput = z.input<typeof totpLoginSchema>;

export const totpEnableSchema = z.strictObject({ code: totpCodeSchema });
export const totpDisableSchema = z.strictObject({
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  code: totpCodeSchema,
});
export type TotpDisableInput = z.input<typeof totpDisableSchema>;

export const totpStatusSchema = z.object({
  enabled: z.boolean(),
  backupCodesLeft: z.number().int(),
});
export type TotpStatus = z.infer<typeof totpStatusSchema>;

export const totpSetupSchema = z.object({
  /** Base32 key for manual entry. */
  secret: z.string(),
  /** otpauth:// link (opens the authenticator app on a phone). */
  uri: z.string(),
});
