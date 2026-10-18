"use client";

import { formatTaka } from "@aaarchive/shared/money";
import {
  type AdminProductListQuery,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  PRODUCT_STOCK_FILTERS,
} from "@aaarchive/shared/product";
import { cn } from "cn";
import { ImageOff, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ExportMenu } from "@/components/admin/export-menu";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { NativeSelect } from "@/components/admin/native-select";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { MediaImage } from "@/components/store/media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/lib/category/use-categories";
import { format, getMessages } from "@/lib/i18n/i18n";
import { exportProducts } from "@/lib/product/product-api";
import type { AdminProductListItem } from "@/lib/product/product-schemas";
import { useProducts } from "@/lib/product/use-products";
import { ProductStatusBadge } from "./product-status-badge";

const PAGE_SIZE = 20;
const NO_FILTERS = {
  q: undefined,
  category: undefined,
  status: undefined,
  stock: undefined,
};

function oneOf<T extends string>(
  values: readonly T[],
  value: string | null,
): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined;
}

/** The list query, read from the URL so filters survive reloads and links. */
function useListQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query: AdminProductListQuery = {
    q: params.get("q") ?? undefined,
    categoryId: params.get("category") ?? undefined,
    status: oneOf(PRODUCT_STATUSES, params.get("status")),
    stock: oneOf(PRODUCT_STOCK_FILTERS, params.get("stock")),
    sort: oneOf(PRODUCT_SORTS, params.get("sort")) ?? "updated",
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: PAGE_SIZE,
  };
  const set = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change starts again at page 1.
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return { query, set };
}

export function ProductsScreen() {
  const t = getMessages().admin;
  const tp = t.products;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const { query, set } = useListQuery();
  const products = useProducts(query);
  const categories = useCategories();
  const [search, setSearch] = React.useState(query.q ?? "");

  // Follow the URL when it changes elsewhere (top-bar search, back button).
  React.useEffect(() => setSearch(query.q ?? ""), [query.q]);

  const filtered = Boolean(
    query.q || query.categoryId || query.status || query.stock,
  );
  const total = products.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={t.nav.products}
        description={canEdit ? tp.intro : t.common.readOnly}
        actions={
          // Products & stock export is Owner only (PRD §6.9 rule 2).
          canEdit && (
            <>
              <ExportMenu
                onExport={(format) => {
                  const { page: _page, limit: _limit, ...filters } = query;
                  return exportProducts(filters, format);
                }}
              />
              <Button size="lg" asChild>
                <Link href="/admin/products/new">
                  <Plus />
                  {tp.newProduct}
                </Link>
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <search className="relative lg:w-72">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              set({ q: search.trim() || undefined });
            }}
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => {
                if (search.trim() !== (query.q ?? "")) {
                  set({ q: search.trim() || undefined });
                }
              }}
              placeholder={tp.searchPlaceholder}
              aria-label={tp.searchLabel}
              maxLength={80}
              className="h-9 pl-8"
            />
          </form>
        </search>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <NativeSelect
            aria-label={tp.columns.category}
            value={query.categoryId ?? ""}
            onChange={(e) => set({ category: e.target.value || undefined })}
            className="lg:w-44"
          >
            <option value="">{tp.allCategories}</option>
            {categories.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={tp.fields.status}
            value={query.status ?? ""}
            onChange={(e) => set({ status: e.target.value || undefined })}
            className="lg:w-36"
          >
            <option value="">{tp.allStatuses}</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tp.status[s]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={tp.columns.stock}
            value={query.stock ?? ""}
            onChange={(e) => set({ stock: e.target.value || undefined })}
            className="lg:w-36"
          >
            <option value="">{tp.allStock}</option>
            <option value="low">{tp.stockLow}</option>
            <option value="out">{tp.stockOut}</option>
          </NativeSelect>
          <NativeSelect
            aria-label={tp.sortLabel}
            value={query.sort}
            onChange={(e) =>
              set({
                sort: e.target.value === "updated" ? undefined : e.target.value,
              })
            }
            className="lg:w-48"
          >
            {PRODUCT_SORTS.map((s) => (
              <option key={s} value={s}>
                {tp.sort[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {products.isPending ? (
        <ListSkeleton />
      ) : products.isError ? (
        <ListError error={products.error} onRetry={() => products.refetch()} />
      ) : products.data.data.length === 0 ? (
        <ListEmpty>
          {filtered ? (
            <div className="flex flex-col items-center gap-3">
              <p>{tp.noResults}</p>
              <Button variant="outline" onClick={() => set(NO_FILTERS)}>
                {tp.clearFilters}
              </Button>
            </div>
          ) : undefined}
        </ListEmpty>
      ) : (
        <>
          <Table
            className={cn(products.isPlaceholderData && "opacity-60")}
            aria-busy={products.isFetching}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{tp.columns.product}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {tp.columns.category}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {tp.columns.price}
                </TableHead>
                <TableHead className="text-right">{tp.columns.stock}</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  {tp.columns.updated}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data.data.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </TableBody>
          </Table>
          {pages > 1 && (
            <nav
              aria-label={tp.pagination}
              className="mt-4 flex items-center justify-between gap-2"
            >
              <Button
                variant="outline"
                disabled={(query.page ?? 1) <= 1}
                onClick={() => set({ page: String((query.page ?? 1) - 1) })}
              >
                {tp.previous}
              </Button>
              <p className="font-mono text-muted-foreground text-xs">
                {format(tp.page, { page: query.page ?? 1, pages })}
              </p>
              <Button
                variant="outline"
                disabled={(query.page ?? 1) >= pages}
                onClick={() => set({ page: String((query.page ?? 1) + 1) })}
              >
                {tp.next}
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function ProductRow({ product: p }: { product: AdminProductListItem }) {
  const tp = getMessages().admin.products;
  const href = `/admin/products/${p.id}`;
  const stockTone =
    p.variantCount === 0
      ? "text-muted-foreground"
      : p.outOfStockCount > 0 && p.totalStock === 0
        ? "text-destructive"
        : p.lowStockCount > 0 || p.outOfStockCount > 0
          ? "text-primary"
          : "";
  return (
    <TableRow className="relative h-14">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative aspect-[4/5] w-9 shrink-0 overflow-hidden rounded-md border bg-sunken">
            {p.image ? (
              <MediaImage media={p.image} alt="" sizes="36px" fill />
            ) : (
              <ImageOff
                aria-hidden
                className="absolute inset-0 m-auto size-4 text-subtle"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            {/* The whole row is clickable through this link's ::after. */}
            <Link
              href={href}
              className="truncate font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
            >
              {p.name}
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <ProductStatusBadge status={p.status} />
              {p.isFeatured && <Badge variant="secondary">{tp.featured}</Badge>}
              {p.saleActive && <Badge variant="sale">{tp.onSale}</Badge>}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {p.category.name}
      </TableCell>
      <TableCell className="hidden text-right font-mono sm:table-cell">
        {p.saleActive && p.salePrice != null ? (
          <span className="flex flex-col items-end">
            <span>{formatTaka(p.salePrice)}</span>
            <s className="text-muted-foreground text-xs">
              {formatTaka(p.basePrice)}
            </s>
          </span>
        ) : (
          formatTaka(p.basePrice)
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {p.variantCount === 0 ? (
          <span className="text-muted-foreground text-xs">{tp.noVariants}</span>
        ) : (
          <span className="flex flex-col items-end">
            <span className={stockTone}>{p.totalStock}</span>
            {(p.lowStockCount > 0 || p.outOfStockCount > 0) && (
              <span className="text-muted-foreground text-xs">
                {format(tp.stockSummary, {
                  low: p.lowStockCount,
                  out: p.outOfStockCount,
                })}
              </span>
            )}
          </span>
        )}
      </TableCell>
      <TableCell className="hidden text-right font-mono text-muted-foreground text-xs lg:table-cell">
        {new Date(p.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </TableCell>
    </TableRow>
  );
}
