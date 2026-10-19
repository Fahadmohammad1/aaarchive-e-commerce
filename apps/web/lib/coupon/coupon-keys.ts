import type { CouponListQuery } from "@aaarchive/shared/coupon";

export const couponKeys = {
  all: ["coupons"] as const,
  list: (query: CouponListQuery = {}) =>
    [...couponKeys.all, "list", query] as const,
};
