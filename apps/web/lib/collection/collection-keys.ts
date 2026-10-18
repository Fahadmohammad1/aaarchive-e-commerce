import type { CatalogListQuery } from "@aaarchive/shared/catalog";

export const collectionKeys = {
  all: ["collections"] as const,
  list: (query: CatalogListQuery = {}) =>
    [...collectionKeys.all, "list", query] as const,
};
