import type { CouponApplyInput } from "@aaarchive/shared/checkout";
import { api } from "@/lib/api/api-client";
import type { AppliedCoupon } from "./coupon-schemas";

// Storefront: no Zod at runtime (rules.md §4.2).

export function applyCoupon(body: CouponApplyInput): Promise<AppliedCoupon> {
  return api.post<AppliedCoupon>("/coupons/apply", { body });
}
