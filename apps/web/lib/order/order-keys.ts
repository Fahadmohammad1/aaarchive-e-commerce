import type { AdminOrderListQuery } from "@aaarchive/shared/order";

export const orderKeys = {
  all: ["orders"] as const,
  list: (query: AdminOrderListQuery = {}) =>
    [...orderKeys.all, "list", query] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};
