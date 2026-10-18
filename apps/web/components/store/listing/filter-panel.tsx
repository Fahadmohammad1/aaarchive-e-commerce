"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/i18n";
import {
  type ListingFilters,
  listingQueryString,
} from "@/lib/product/listing-query";
import type { StoreFilters } from "@/lib/product/product-store-schemas";
import { cn } from "@/lib/utils";

export type PanelProps = {
  filters: ListingFilters;
  options: StoreFilters;
  basePath: string;
};

/** Applies a filter change by navigating: the server renders the new list. */
export function useApply(basePath: string) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const apply = (next: ListingFilters) =>
    start(() =>
      router.push(`${basePath}${listingQueryString(next)}`, { scroll: false }),
    );
  return { apply, pending };
}

function toggle(
  list: string[] | undefined,
  value: string,
): string[] | undefined {
  const next = list?.includes(value)
    ? list.filter((v) => v !== value)
    : [...(list ?? []), value];
  return next.length ? next : undefined;
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="group border-b py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between type-mono-label uppercase">
        {title}
        <span
          aria-hidden
          className="text-muted-foreground group-open:rotate-45 transition-transform"
        >
          +
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

/** Size, colour, price and in-stock groups (design §7.1). */
export function FilterGroups({ filters, options, basePath }: PanelProps) {
  const t = getMessages().listing;
  const { apply, pending } = useApply(basePath);
  const [min, setMin] = React.useState(filters.minPrice?.toString() ?? "");
  const [max, setMax] = React.useState(filters.maxPrice?.toString() ?? "");
  React.useEffect(
    () => setMin(filters.minPrice?.toString() ?? ""),
    [filters.minPrice],
  );
  React.useEffect(
    () => setMax(filters.maxPrice?.toString() ?? ""),
    [filters.maxPrice],
  );

  const applyPrice = () => {
    const toNum = (v: string) =>
      v.trim() && Number.isFinite(Number(v))
        ? Math.max(0, Math.round(Number(v)))
        : undefined;
    apply({ ...filters, minPrice: toNum(min), maxPrice: toNum(max) });
  };

  return (
    <div aria-busy={pending} className={cn(pending && "opacity-70")}>
      {options.sizes.length > 0 && (
        <Group title={t.size}>
          <div className="flex flex-wrap gap-2">
            {options.sizes.map((size) => {
              const on = filters.size?.includes(size) ?? false;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    apply({ ...filters, size: toggle(filters.size, size) })
                  }
                  className={cn(
                    "flex h-11 min-w-11 items-center justify-center border px-2 type-mono-label outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-line-strong",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </Group>
      )}
      {options.colors.length > 0 && (
        <Group title={t.color}>
          <ul className="flex flex-col">
            {options.colors.map((color) => {
              const on = filters.color?.includes(color.name) ?? false;
              return (
                <li key={color.name}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      apply({
                        ...filters,
                        color: toggle(filters.color, color.name),
                      })
                    }
                    className="flex min-h-11 w-full items-center gap-3 text-left type-mono-label outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-5 rounded-full border border-line-strong",
                        on &&
                          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                    <span
                      className={cn(
                        on ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {color.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      )}
      <Group title={t.price}>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
        >
          {(
            [
              ["min", t.minPrice, min, setMin, options.price.min],
              ["max", t.maxPrice, max, setMax, options.price.max],
            ] as const
          ).map(([key, label, value, set, placeholder]) => (
            <label
              key={key}
              className="flex flex-1 flex-col gap-1 text-muted-foreground type-mono-micro"
            >
              {label}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                placeholder={String(placeholder)}
                onChange={(e) => set(e.target.value)}
                className="h-11 w-full border border-border bg-card px-2 text-foreground type-mono-label outline-none focus-visible:border-primary"
              />
            </label>
          ))}
          <Button
            type="submit"
            variant="outline"
            className="h-11 rounded-none type-mono-label"
          >
            {t.applyPrice}
          </Button>
        </form>
      </Group>
      <div className="py-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 type-mono-label">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={Boolean(filters.inStock)}
            onChange={(e) =>
              apply({ ...filters, inStock: e.target.checked || undefined })
            }
          />
          {t.inStock}
        </label>
      </div>
    </div>
  );
}
