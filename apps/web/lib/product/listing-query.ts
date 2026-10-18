import type {
  StoreProductListQuery,
  StoreSort,
} from "@aaarchive/shared/storefront";

// Client-safe listing URL helpers: type imports only, so no Zod reaches the
// storefront bundle (parsing lives in listing-params.ts, server side).

export type ListingFilters = Pick<
  StoreProductListQuery,
  "size" | "color" | "minPrice" | "maxPrice" | "inStock"
> & { sort: StoreSort };

/** The query string for `filters` (newest is the default, so it is left out). */
export function listingQueryString(filters: ListingFilters): string {
  const qs = new URLSearchParams();
  for (const size of filters.size ?? []) qs.append("size", size);
  for (const color of filters.color ?? []) qs.append("color", color);
  if (filters.minPrice !== undefined)
    qs.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined)
    qs.set("maxPrice", String(filters.maxPrice));
  if (filters.inStock) qs.set("inStock", "1");
  if (filters.sort !== "newest") qs.set("sort", filters.sort);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(filters: ListingFilters): number {
  return (
    (filters.size?.length ?? 0) +
    (filters.color?.length ?? 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0)
  );
}
