import { cacheTags } from "@aaarchive/shared/cache-tags";
import type { StoreProductListQuery } from "@aaarchive/shared/storefront";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/lib/api/api-client";
import { ApiError } from "@/lib/api/api-error";
import {
  storeFiltersSchema,
  storeProductPageSchema,
  storeProductSchema,
  storeProductStockSchema,
} from "./product-store-schemas";

// Server-only catalog fetchers (docs/architecture.md §3.1). Cached with the
// "catalog" profile and tagged so the API's revalidation webhook refreshes
// them on admin edits. Arguments are plain values (never request data).

export async function getStoreProducts(query: StoreProductListQuery) {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.products);
  if (query.category) cacheTag(cacheTags.category(query.category));
  if (query.collection) cacheTag(cacheTags.collection(query.collection));
  return api.get("/products", { query, schema: storeProductPageSchema });
}

export async function getStoreFilters(scope: {
  category?: string;
  collection?: string;
}) {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.products);
  return api.get("/products/filters", {
    query: scope,
    schema: storeFiltersSchema,
  });
}

/** The product, or null when it is missing or not published. */
export async function getStoreProduct(slug: string) {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.products, cacheTags.product(slug));
  try {
    return await api.get(`/products/${encodeURIComponent(slug)}`, {
      schema: storeProductSchema,
    });
  } catch (error) {
    if (ApiError.isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

/** Per-variant status at request time: NEVER cached (PRD §8.2). */
export function getStoreProductStock(slug: string) {
  return api.get(`/products/${encodeURIComponent(slug)}/stock`, {
    schema: storeProductStockSchema,
    cache: "no-store",
  });
}

export async function searchStoreProducts(q: string, page = 1) {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.products);
  return api.get("/search", {
    query: { q, page },
    schema: storeProductPageSchema,
  });
}
