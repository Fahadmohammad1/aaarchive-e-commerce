import type { AdminProductListQuery } from "@aaarchive/shared/product";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (query: AdminProductListQuery = {}) =>
    [...productKeys.lists(), query] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
};
