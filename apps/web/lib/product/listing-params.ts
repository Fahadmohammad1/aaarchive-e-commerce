import {
  STORE_SORTS,
  type StoreSort,
  storeProductListQuerySchema,
} from "@aaarchive/shared/storefront";
import type { ListingFilters } from "./listing-query";

// Server only (pulls in Zod): parses the shop filters from the URL.
// Client components use listing-query.ts.
// Shop filters live in the URL (PRD §5.3): shareable and indexable.
// `?size=M&size=L&color=Black&minPrice=1000&inStock=1&sort=price_asc`

export type SearchParams = Record<string, string | string[] | undefined>;

export type { ListingFilters } from "./listing-query";

const FILTER_KEYS = [
  "size",
  "color",
  "minPrice",
  "maxPrice",
  "inStock",
] as const;

/** Reads the filters, dropping any single bad value instead of failing. */
export function parseListingParams(params: SearchParams): ListingFilters {
  const out: ListingFilters = { sort: "newest" };
  const shape = storeProductListQuerySchema.shape;
  for (const key of FILTER_KEYS) {
    const raw = params[key];
    if (raw === undefined) continue;
    const parsed = shape[key].safeParse(raw);
    if (parsed.success && parsed.data !== undefined) {
      (out as Record<string, unknown>)[key] = parsed.data;
    }
  }
  const sort = params.sort;
  if (
    typeof sort === "string" &&
    (STORE_SORTS as readonly string[]).includes(sort)
  ) {
    out.sort = sort as StoreSort;
  }
  return out;
}
