import { z } from "zod";
import { emailSchema, newPasswordSchema, PASSWORD_MAX_LENGTH } from "./auth.js";
import { BD_DISTRICTS, trackOrderSchema } from "./checkout.js";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "./order.js";
import { bdPhoneSchema } from "./phone.js";

// Customer accounts (PRD §5.10, owner 2026-10-21). Optional: guest checkout
// stays. Customers sign in with email + password or Google; their sessions
// are separate from the dashboard's (own refresh cookie, CUSTOMER role).

const personName = z
  .string({ message: "REQUIRED" })
  .trim()
  .min(1, { message: "REQUIRED" })
  .min(2, { message: "TOO_SHORT" })
  .max(60, { message: "TOO_LONG" });

const turnstileToken = z.string().max(4096).optional();

/** POST /account/auth/register */
export const registerSchema = z.strictObject({
  name: personName,
  email: emailSchema,
  password: newPasswordSchema,
  turnstileToken,
});
export type RegisterInput = z.input<typeof registerSchema>;

/** POST /account/auth/forgot-password — always answers 204 (no enumeration). */
export const forgotPasswordSchema = z.strictObject({
  email: emailSchema,
  turnstileToken,
});
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

/** One-time tokens from emailed links: 32 random bytes, base64url. */
export const accountTokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{32,128}$/, { message: "INVALID_TOKEN" });

/** POST /account/auth/reset-password */
export const resetPasswordSchema = z.strictObject({
  token: accountTokenSchema,
  password: newPasswordSchema,
});
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

/** POST /account/auth/verify-email */
export const verifyEmailSchema = z.strictObject({ token: accountTokenSchema });

/** Customers without a password yet (Google sign-up) set one with the reset link. */
export const customerChangePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newPassword: newPasswordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "PASSWORD_UNCHANGED",
    path: ["newPassword"],
  });

/** PATCH /account/me. `phone: null` removes it. */
export const profileUpdateSchema = z
  .strictObject({
    name: personName,
    phone: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      bdPhoneSchema.nullable(),
    ),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "NOTHING_TO_CHANGE" });
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

export const accountProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  emailVerified: z.boolean(),
  hasPassword: z.boolean(),
  hasGoogle: z.boolean(),
});
export type AccountProfile = z.infer<typeof accountProfileSchema>;

// ── Saved addresses ────────────────────────────────────────────────────────

export const MAX_SAVED_ADDRESSES = 10;

function text(min: number, max: number) {
  return z
    .string({ message: "REQUIRED" })
    .trim()
    .min(1, { message: "REQUIRED" })
    .min(min, { message: "TOO_SHORT" })
    .max(max, { message: "TOO_LONG" });
}

/** POST /account/addresses and PUT /account/addresses/:id (whole address). */
export const addressInputSchema = z.strictObject({
  /** Who receives the parcel (same rules as checkout). */
  name: personName,
  phone: bdPhoneSchema,
  zoneId: z.string({ message: "REQUIRED" }).min(1, { message: "REQUIRED" }),
  district: z.enum(BD_DISTRICTS, { message: "REQUIRED" }),
  area: text(2, 80),
  address: text(5, 200),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof addressInputSchema>;

export const savedAddressSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  zone: z.object({ id: z.string(), name: z.string() }),
  district: z.enum(BD_DISTRICTS),
  area: z.string(),
  address: z.string(),
  isDefault: z.boolean(),
});
export type SavedAddress = z.infer<typeof savedAddressSchema>;

// ── My orders ──────────────────────────────────────────────────────────────

/**
 * POST /account/orders/claim — links a guest order to the account. Needs the
 * same proof as tracking (phone + order number): a phone number alone is not
 * proof of identity without SMS verification (rules.md §8.3).
 */
export const claimOrderSchema = trackOrderSchema;

export const accountOrderListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const accountOrderSummarySchema = z.object({
  orderNumber: z.string(),
  createdAt: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  total: z.number().int(),
  itemCount: z.number().int(),
});
export type AccountOrderSummary = z.infer<typeof accountOrderSummarySchema>;
