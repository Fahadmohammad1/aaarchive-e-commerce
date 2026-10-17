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
