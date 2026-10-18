"use client";

import type { StoreProductListQuery } from "@aaarchive/shared/storefront";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/i18n";
import { useMoreStoreProducts } from "@/lib/product/use-store-products";
import { ProductGrid } from "../product-grid";

/**
 * Pages after the first (PRD §5.3: 12 per page, "Load more"). Page 1 is
 * server-rendered and cached; later pages are fetched in the browser.
 */
export function LoadMore({
  query,
  total,
  shown,
}: {
  query: StoreProductListQuery;
  total: number;
  /** Products already on the page (the server-rendered first page). */
  shown: number;
}) {
  const t = getMessages().listing;
  const [started, setStarted] = React.useState(false);
  const more = useMoreStoreProducts(query, started);
  const extra = more.data?.pages.flatMap((p) => p.data) ?? [];
  const hasMore = started ? more.hasNextPage : shown < total;
  const busy = more.isFetching;

  return (
    <>
      {extra.length > 0 && (
        <div className="mt-8">
          <ProductGrid products={extra} />
        </div>
      )}
      {more.isError && (
        <p
          role="alert"
          className="mt-6 border border-destructive p-3 text-center type-mono-label"
        >
          {t.loadFailed}
        </p>
      )}
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            disabled={busy}
            className="h-11 min-w-40 rounded-none type-mono-label uppercase"
            onClick={() =>
              started ? void more.fetchNextPage() : setStarted(true)
            }
          >
            {busy ? t.loading : t.loadMore}
          </Button>
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {extra.length > 0 ? `${shown + extra.length} / ${total}` : ""}
      </p>
    </>
  );
}
