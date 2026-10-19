import { X } from "lucide-react";
import Link from "next/link";
import { ArrowButton } from "@/components/store/arrow-button";
import { format, getMessages } from "@/lib/i18n/i18n";
import {
  activeFilterCount,
  type ListingFilters,
  listingQueryString,
} from "@/lib/product/listing-query";
import {
  getStoreFilters,
  getStoreProducts,
} from "@/lib/product/product-store-api";
import { ProductGrid, ProductGridSkeleton } from "../product-grid";
import { FilterGroups } from "./filter-panel";
import { ListingToolbar } from "./listing-toolbar";
import { LoadMore } from "./load-more";

type Scope = { category?: string; collection?: string };

/** Accent tags with ✕ for each active filter (design §7.1). */
function ActiveFilters({
  filters,
  basePath,
}: {
  filters: ListingFilters;
  basePath: string;
}) {
  const t = getMessages().listing;
  const tags: Array<{ label: string; next: ListingFilters }> = [
    ...(filters.size ?? []).map((size) => ({
      label: size,
      next: { ...filters, size: filters.size?.filter((s) => s !== size) },
    })),
    ...(filters.color ?? []).map((color) => ({
      label: color,
      next: { ...filters, color: filters.color?.filter((c) => c !== color) },
    })),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? [
          {
            label: format(t.priceRange, {
              min: filters.minPrice ?? 0,
              max: filters.maxPrice ?? "∞",
            }),
            next: { ...filters, minPrice: undefined, maxPrice: undefined },
          },
        ]
      : []),
    ...(filters.inStock
      ? [{ label: t.inStock, next: { ...filters, inStock: undefined } }]
      : []),
  ];
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <li key={tag.label}>
          <Link
            href={`${basePath}${listingQueryString(tag.next)}`}
            scroll={false}
            aria-label={format(t.removeFilter, { name: tag.label })}
            className="inline-flex h-6 items-center gap-1 bg-primary px-2 text-primary-foreground type-mono-label"
          >
            {tag.label}
            <X aria-hidden className="size-3" />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={`${basePath}${listingQueryString({ sort: filters.sort })}`}
          scroll={false}
          className="text-muted-foreground underline-offset-4 type-mono-label hover:underline"
        >
          {t.clearAll}
        </Link>
      </li>
    </ul>
  );
}

/**
 * Toolbar, filters and the first page of products for /shop, a category or a
 * collection (design §7.1). Page 1 comes from the cached server fetch.
 */
export async function ProductListing({
  scope,
  filters,
  basePath,
}: {
  scope: Scope;
  filters: ListingFilters;
  basePath: string;
}) {
  const t = getMessages().listing;
  const query = { ...scope, ...filters };
  const [page, options] = await Promise.all([
    getStoreProducts({ ...query, page: 1 }),
    getStoreFilters(scope),
  ]);
  const total = page.meta.total;
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div className="flex flex-col gap-6">
      <p
        className="text-muted-foreground type-mono-label uppercase"
        aria-live="polite"
      >
        {total === 1 ? t.result : format(t.results, { count: total })}
      </p>
      <ListingToolbar filters={filters} options={options} basePath={basePath} />
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label={t.filters} className="hidden lg:block">
          <FilterGroups
            filters={filters}
            options={options}
            basePath={basePath}
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <ActiveFilters filters={filters} basePath={basePath} />
          {page.data.length === 0 ? (
            <div className="flex flex-col items-center gap-6 border border-dashed py-16 text-center">
              <p className="type-mono-label">
                {filtered ? t.emptyFiltered : t.empty}
              </p>
              <ArrowButton href={filtered ? basePath : "/shop"}>
                {t.backToShop}
              </ArrowButton>
            </div>
          ) : (
            <>
              {/* Keeps heading order h1 → h2 → card h3 for screen readers. */}
              <h2 className="sr-only">{t.productsHeading}</h2>
              <ProductGrid products={page.data} priorityCount={2} />
              {/* Keyed by the filters so a new query starts from page 2 again. */}
              <LoadMore
                key={listingQueryString(filters)}
                query={query}
                total={total}
                shown={page.data.length}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductListingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="skeleton h-4 w-28" />
      <div className="skeleton h-12 w-full" />
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="hidden lg:block skeleton h-96" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
