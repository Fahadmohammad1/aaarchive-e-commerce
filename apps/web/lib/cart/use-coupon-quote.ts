"use client";

import type { CartItemInput } from "@aaarchive/shared/checkout";
import { useQuery } from "@tanstack/react-query";
import { applyCoupon } from "@/lib/coupon/coupon-store-api";
import { cartKeys } from "./cart-keys";

/**
 * What the typed coupon is worth on this cart, asked of the API (PRD §5.7).
 * The amount is only shown; the order is priced again on the server.
 */
export function useCouponQuote(
  code: string | null,
  items: CartItemInput[],
  phone: string | null = null,
) {
  return useQuery({
    queryKey: cartKeys.coupon(code ?? "", items, phone),
    queryFn: () =>
      applyCoupon({ code: code ?? "", items, ...(phone ? { phone } : {}) }),
    enabled: Boolean(code) && items.length > 0,
    staleTime: 0,
    retry: false,
  });
}
