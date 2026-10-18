import type { StoreProductListQuery } from "@aaarchive/shared/storefront";

export const storeProductKeys = {
  all: ["store-products"] as const,
  list: (query: StoreProductListQuery) =>
    [...storeProductKeys.all, "list", query] as const,
  search: (q: string) => [...storeProductKeys.all, "search", q] as const,
};
