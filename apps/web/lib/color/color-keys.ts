import type { CatalogListQuery } from "@aaarchive/shared/catalog";

export const colorKeys = {
  all: ["colors"] as const,
  list: (query: CatalogListQuery = {}) =>
    [...colorKeys.all, "list", query] as const,
};
