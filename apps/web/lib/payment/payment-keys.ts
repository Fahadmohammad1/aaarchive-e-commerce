import type { PaymentListQuery } from "@aaarchive/shared/order";

export const paymentKeys = {
  all: ["payments"] as const,
  list: (query: PaymentListQuery = {}) =>
    [...paymentKeys.all, "list", query] as const,
};
