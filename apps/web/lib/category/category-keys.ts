import type { CatalogListQuery } from "@aaarchive/shared/catalog";

export const categoryKeys = {
  all: ["categories"] as const,
  list: (query: CatalogListQuery = {}) =>
    [...categoryKeys.all, "list", query] as const,
};
