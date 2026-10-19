import type {
  CouponInput,
  CouponListQuery,
  CouponUpdate,
} from "@aaarchive/shared/coupon";
import type { ExportFormat } from "@aaarchive/shared/export";
import { api } from "@/lib/api/api-client";
import { adminCouponSchema, couponPageSchema } from "./coupon-schemas";

const path = (id: string) => `/admin/coupons/${encodeURIComponent(id)}`;

export function listCoupons(query: CouponListQuery, signal?: AbortSignal) {
  return api.get("/admin/coupons", {
    query,
    schema: couponPageSchema,
    signal,
  });
}

export function createCoupon(body: CouponInput) {
  return api.post("/admin/coupons", { body, schema: adminCouponSchema });
}

export function updateCoupon(id: string, body: CouponUpdate) {
  return api.patch(path(id), { body, schema: adminCouponSchema });
}

export function deleteCoupon(id: string): Promise<void> {
  return api.delete(path(id));
}

/** Coupons as CSV/Excel with the list's filters (Owner only). */
export function exportCoupons(
  query: Omit<CouponListQuery, "page" | "limit">,
  format: ExportFormat,
) {
  return api.download("/admin/coupons/export", {
    query: { ...query, format },
    timeoutMs: 120_000,
  });
}
