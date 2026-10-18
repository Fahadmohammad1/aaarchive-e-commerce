import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowButton } from "@/components/store/arrow-button";
import { ListingHeader } from "@/components/store/listing/listing-header";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/store/product-grid";
import { format, getMessages } from "@/lib/i18n/i18n";
import { searchStoreProducts } from "@/lib/product/product-store-api";

const t = getMessages();

// Results pages are not worth indexing: the product pages are.
export const metadata: Metadata = {
  title: t.search.title,
  robots: { index: false, follow: true },
};

async function Results({ searchParams }: PageProps<"/search">) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 80);
  if (!q) {
    return (
      <p className="text-muted-foreground type-mono-label">{t.search.hint}</p>
    );
  }
  const results = await searchStoreProducts(q);
  return (
    <div className="flex flex-col gap-6">
      <p className="type-mono-label uppercase" aria-live="polite">
        {format(t.search.resultsFor, { q })} ·{" "}
        {results.meta.total === 1
          ? t.listing.result
          : format(t.listing.results, { count: results.meta.total })}
      </p>
      {results.data.length === 0 ? (
        <div className="flex flex-col items-center gap-6 border border-dashed py-16 text-center">
          <p className="type-mono-label">{format(t.search.noResults, { q })}</p>
          <ArrowButton href="/shop">{t.listing.backToShop}</ArrowButton>
        </div>
      ) : (
        <ProductGrid products={results.data} priorityCount={2} />
      )}
    </div>
  );
}

// /search?q= (PRD §5.4).
export default function SearchPage(props: PageProps<"/search">) {
  return (
    <div className="site-container pb-20">
      <ListingHeader
        title={t.search.title}
        crumbs={[{ name: t.search.title, href: "/search" }]}
      />
      <Suspense fallback={<ProductGridSkeleton />}>
        <Results {...props} />
      </Suspense>
    </div>
  );
}
