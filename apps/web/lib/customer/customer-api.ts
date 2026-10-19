import type {
  BlockPhoneInput,
  CustomerListQuery,
} from "@aaarchive/shared/customer";
import type { ExportFormat } from "@aaarchive/shared/export";
import { api } from "@/lib/api/api-client";
import {
  blockedPhonePageSchema,
  blockedPhoneSchema,
  customerDetailSchema,
  customerPageSchema,
} from "./customer-schemas";

export function listCustomers(query: CustomerListQuery, signal?: AbortSignal) {
  return api.get("/admin/customers", {
    query,
    schema: customerPageSchema,
    signal,
  });
}

export function getCustomer(phone: string, signal?: AbortSignal) {
  return api.get(`/admin/customers/${encodeURIComponent(phone)}`, {
    schema: customerDetailSchema,
    signal,
  });
}

export function exportCustomers(
  query: Omit<CustomerListQuery, "page" | "limit">,
  format: ExportFormat,
) {
  return api.download("/admin/customers/export", {
    query: { ...query, format },
    timeoutMs: 120_000,
  });
}

export function listBlockedPhones(q: string, signal?: AbortSignal) {
  return api.get("/admin/blocked-phones", {
    query: { q, limit: 100 },
    schema: blockedPhonePageSchema,
    signal,
  });
}

export function blockPhone(body: BlockPhoneInput) {
  return api.post("/admin/blocked-phones", {
    body,
    schema: blockedPhoneSchema,
  });
}

export function unblockPhone(id: string): Promise<void> {
  return api.delete(`/admin/blocked-phones/${encodeURIComponent(id)}`);
}
