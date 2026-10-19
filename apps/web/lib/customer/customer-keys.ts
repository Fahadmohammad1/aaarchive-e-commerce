import type { CustomerListQuery } from "@aaarchive/shared/customer";

export const customerKeys = {
  all: ["customers"] as const,
  list: (query: CustomerListQuery = {}) =>
    [...customerKeys.all, "list", query] as const,
  detail: (phone: string) => [...customerKeys.all, "detail", phone] as const,
  blocked: (q = "") => [...customerKeys.all, "blocked", q] as const,
};
