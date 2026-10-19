import { COUPON_SCOPES, COUPON_TYPES } from "@aaarchive/shared/coupon";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

export const adminCouponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(COUPON_TYPES),
  value: z.number().int(),
  minOrder: z.number().int(),
  maxDiscount: z.number().int().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  usageLimit: z.number().int().nullable(),
  perPhoneLimit: z.number().int().nullable(),
  scope: z.enum(COUPON_SCOPES),
  scopeIds: z.array(z.string()),
  isActive: z.boolean(),
  usedCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminCoupon = z.infer<typeof adminCouponSchema>;

export const couponPageSchema = pagedSchema(adminCouponSchema);

/** POST /coupons/apply. */
export type AppliedCoupon = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  discount: number;
  subtotal: number;
};
