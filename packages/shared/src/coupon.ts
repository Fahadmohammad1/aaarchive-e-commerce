import { z } from "zod";
import { exportFormatSchema } from "./export.js";
import { PRICE_MAX } from "./product.js";

// Coupons (PRD §5.7, §6.6). The API applies them; the web only sends a code.

export const COUPON_TYPES = ["PERCENT", "FIXED"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];
export const COUPON_SCOPES = ["ALL", "CATEGORY", "PRODUCT"] as const;
export type CouponScope = (typeof COUPON_SCOPES)[number];

/** Stored and compared upper-case: "eid10" and "EID10" are the same coupon. */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(3, { message: "TOO_SHORT" })
  .max(30, { message: "TOO_LONG" })
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9_-]+$/, { message: "INVALID_CODE" }));

const amountSchema = z
  .number({ message: "REQUIRED" })
  .int({ message: "WHOLE_TAKA" })
  .min(1, { message: "TOO_SMALL" })
  .max(PRICE_MAX, { message: "TOO_BIG" });

const limitSchema = z
  .number()
  .int({ message: "INVALID" })
  .min(1, { message: "TOO_SMALL" })
  .max(1_000_000, { message: "TOO_BIG" })
  .nullable();

const dateSchema = z.iso
  .datetime({ offset: true, message: "INVALID_DATE" })
  .nullable();

const couponFields = {
  code: couponCodeSchema,
  type: z.enum(COUPON_TYPES),
  /** Percent (1–100) for PERCENT, whole taka for FIXED. */
  value: amountSchema,
  minOrder: z.number().int().min(0).max(PRICE_MAX),
  /** Cap for PERCENT coupons. */
  maxDiscount: amountSchema.nullable(),
  startsAt: dateSchema,
  endsAt: dateSchema,
  usageLimit: limitSchema,
  perPhoneLimit: limitSchema,
  scope: z.enum(COUPON_SCOPES),
  /** Category ids (CATEGORY) or product ids (PRODUCT). */
  scopeIds: z.array(z.string().min(1).max(40)).max(100),
  isActive: z.boolean(),
};

type CouponRuleFields = {
  type?: CouponType;
  value?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  scope?: CouponScope;
  scopeIds?: string[];
};

/** Cross-field rules, also re-checked by the API on the merged record for PATCH. */
export function couponIssues(
  c: CouponRuleFields,
): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (c.type === "PERCENT" && c.value != null && c.value > 100) {
    issues.push({ path: "value", message: "PERCENT_MAX_100" });
  }
  if (c.startsAt && c.endsAt && new Date(c.endsAt) <= new Date(c.startsAt)) {
    issues.push({ path: "endsAt", message: "END_BEFORE_START" });
  }
  if (c.scope && c.scope !== "ALL" && (c.scopeIds?.length ?? 0) === 0) {
    issues.push({ path: "scopeIds", message: "REQUIRED" });
  }
  return issues;
}

function refineCoupon(c: CouponRuleFields, ctx: z.RefinementCtx) {
  for (const issue of couponIssues(c)) {
    ctx.addIssue({
      code: "custom",
      path: [issue.path],
      message: issue.message,
    });
  }
}

export const couponInputSchema = z
  .strictObject({
    ...couponFields,
    minOrder: couponFields.minOrder.default(0),
    maxDiscount: couponFields.maxDiscount.default(null),
    startsAt: couponFields.startsAt.default(null),
    endsAt: couponFields.endsAt.default(null),
    usageLimit: couponFields.usageLimit.default(null),
    perPhoneLimit: couponFields.perPhoneLimit.default(null),
    scope: couponFields.scope.default("ALL"),
    scopeIds: couponFields.scopeIds.default([]),
    isActive: couponFields.isActive.default(true),
  })
  .superRefine(refineCoupon);
export type CouponInput = z.input<typeof couponInputSchema>;
export const couponUpdateSchema = z
  .strictObject(couponFields)
  .partial()
  .superRefine(refineCoupon);
export type CouponUpdate = z.input<typeof couponUpdateSchema>;

export const COUPON_STATUSES = ["active", "inactive"] as const;
export const couponListQuerySchema = z.strictObject({
  q: z.string().trim().max(30).optional(),
  status: z.enum(COUPON_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type CouponListQuery = {
  q?: string;
  status?: (typeof COUPON_STATUSES)[number];
  page?: number;
  limit?: number;
};
export const couponExportQuerySchema = couponListQuerySchema
  .omit({ page: true, limit: true })
  .extend({ format: exportFormatSchema });

// ── Applying a coupon (PRD §5.7, §8.4) ─────────────────────────────────────

/** Why a coupon does not apply. Each maps to a translated message. */
export const COUPON_ERRORS = [
  "COUPON_INVALID",
  "COUPON_EXPIRED",
  "COUPON_NOT_STARTED",
  "COUPON_MIN_ORDER",
  "COUPON_NOT_APPLICABLE",
  "COUPON_LIMIT_REACHED",
] as const;
export type CouponError = (typeof COUPON_ERRORS)[number];

export type CouponRule = {
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  perPhoneLimit: number | null;
  scope: CouponScope;
  scopeIds: string[];
  isActive: boolean;
};

export type CouponLine = {
  productId: string;
  categoryId: string;
  lineTotal: number;
};

export type CouponResult =
  | { ok: true; discount: number }
  | { ok: false; code: CouponError };

/**
 * The discount a coupon gives on these lines (PRD §6.6). The minimum order is
 * checked against the whole subtotal; the discount is taken only from the
 * lines in the coupon's scope. `phoneUses` is how many earlier orders this
 * phone placed with the coupon (null when the phone is not known yet).
 */
export function couponDiscount(
  coupon: CouponRule,
  lines: CouponLine[],
  phoneUses: number | null,
  now: Date = new Date(),
): CouponResult {
  if (!coupon.isActive) return { ok: false, code: "COUPON_INVALID" };
  if (coupon.startsAt && now < coupon.startsAt) {
    return { ok: false, code: "COUPON_NOT_STARTED" };
  }
  if (coupon.endsAt && now >= coupon.endsAt) {
    return { ok: false, code: "COUPON_EXPIRED" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, code: "COUPON_LIMIT_REACHED" };
  }
  if (
    coupon.perPhoneLimit != null &&
    phoneUses != null &&
    phoneUses >= coupon.perPhoneLimit
  ) {
    return { ok: false, code: "COUPON_LIMIT_REACHED" };
  }
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  if (subtotal < coupon.minOrder) {
    return { ok: false, code: "COUPON_MIN_ORDER" };
  }
  const inScope = (l: CouponLine) =>
    coupon.scope === "ALL" ||
    coupon.scopeIds.includes(
      coupon.scope === "CATEGORY" ? l.categoryId : l.productId,
    );
  const eligible = lines
    .filter(inScope)
    .reduce((sum, l) => sum + l.lineTotal, 0);
  if (eligible === 0) return { ok: false, code: "COUPON_NOT_APPLICABLE" };

  let discount =
    coupon.type === "PERCENT"
      ? Math.floor((eligible * coupon.value) / 100)
      : coupon.value;
  if (coupon.type === "PERCENT" && coupon.maxDiscount != null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return { ok: true, discount: Math.min(discount, eligible) };
}
