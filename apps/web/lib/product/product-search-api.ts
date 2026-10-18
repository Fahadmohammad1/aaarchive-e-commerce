import type { StoreProductListQuery } from "@aaarchive/shared/storefront";
import { api } from "@/lib/api/api-client";
import type { StoreProductPage } from "./product-store-schemas";

// Browser-side public reads: search-as-you-type and "Load more" (TanStack
// Query). Not parsed with Zod at runtime, to keep Zod (~30 KB gzipped) out of
// the storefront bundle (rules.md §4.2): the same responses are validated by
// the server fetchers in product-store-api.ts, and these only feed cards.
// Only `import type` from the schemas module here.

export function searchProducts(
  q: string,
  limit: number,
  signal?: AbortSignal,
): Promise<StoreProductPage> {
  return api.get<StoreProductPage>("/search", { query: { q, limit }, signal });
}

export function listStoreProducts(
  query: StoreProductListQuery,
  signal?: AbortSignal,
): Promise<StoreProductPage> {
  return api.get<StoreProductPage>("/products", { query, signal });
}
