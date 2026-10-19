"use client";

import type { CouponInput, CouponListQuery } from "@aaarchive/shared/coupon";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from "./coupon-api";
import { couponKeys } from "./coupon-keys";

export function useCoupons(query: CouponListQuery = {}) {
  return useQuery({
    queryKey: couponKeys.list(query),
    queryFn: ({ signal }) => listCoupons(query, signal),
    placeholderData: keepPreviousData,
  });
}

/** Create (no id) or update (id); the form always sends every field. */
export function useSaveCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CouponInput }) =>
      id ? updateCoupon(id, body) : createCoupon(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
}
