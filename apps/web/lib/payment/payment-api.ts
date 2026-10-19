import type { ExportFormat } from "@aaarchive/shared/export";
import type { PaymentListQuery } from "@aaarchive/shared/order";
import { api } from "@/lib/api/api-client";
import { adminPaymentSchema, paymentPageSchema } from "./payment-schemas";

export function listPayments(query: PaymentListQuery, signal?: AbortSignal) {
  return api.get("/admin/payments", {
    query,
    schema: paymentPageSchema,
    signal,
  });
}

export function verifyPayment(id: string, note?: string) {
  return api.post(`/admin/payments/${encodeURIComponent(id)}/verify`, {
    body: note ? { note } : {},
    schema: adminPaymentSchema,
  });
}

export function rejectPayment(id: string, note: string) {
  return api.post(`/admin/payments/${encodeURIComponent(id)}/reject`, {
    body: { note },
    schema: adminPaymentSchema,
  });
}

export function exportPayments(
  query: Omit<PaymentListQuery, "page" | "limit">,
  format: ExportFormat,
) {
  return api.download("/admin/payments/export", {
    query: { ...query, format },
    timeoutMs: 120_000,
  });
}
