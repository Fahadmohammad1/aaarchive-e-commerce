"use client";

import type { StoreProductListQuery } from "@aaarchive/shared/storefront";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { listStoreProducts, searchProducts } from "./product-search-api";
import { storeProductKeys } from "./product-store-keys";

/** "Load more": pages after the server-rendered first one. */
export function useMoreStoreProducts(
  query: StoreProductListQuery,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: storeProductKeys.list(query),
    queryFn: ({ pageParam, signal }) =>
      listStoreProducts({ ...query, page: pageParam }, signal),
    initialPageParam: 2,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.limit < last.meta.total
        ? last.meta.page + 1
        : undefined,
    enabled,
  });
}

export const INSTANT_RESULTS = 6;

/** Search-as-you-type (PRD §5.4); the caller debounces `q`. */
export function useInstantSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: storeProductKeys.search(term),
    queryFn: ({ signal }) => searchProducts(term, INSTANT_RESULTS, signal),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
