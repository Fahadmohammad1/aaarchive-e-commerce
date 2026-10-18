import type { CatalogListQuery } from "@aaarchive/shared/catalog";

export const sizeChartKeys = {
  all: ["size-charts"] as const,
  list: (query: CatalogListQuery = {}) =>
    [...sizeChartKeys.all, "list", query] as const,
};
