import type { CatalogListQuery } from "@aaarchive/shared/catalog";

export const sizeKeys = {
  all: ["sizes"] as const,
  list: (query: CatalogListQuery = {}) =>
    [...sizeKeys.all, "list", query] as const,
};
