"use client";

import { SlidersHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { format, getMessages } from "@/lib/i18n/i18n";
import {
  activeFilterCount,
  type ListingFilters,
} from "@/lib/product/listing-query";
import { type PanelProps, useApply } from "./filter-panel";

// The phone filter sheet loads on first tap (storefront JS budget).
const FilterSheet = dynamic(
  () => import("./filter-sheet").then((m) => m.FilterSheet),
  {
    ssr: false,
  },
);

/** Toolbar on a hairline: Filter (n) — bottom sheet on phones — and sort. */
export function ListingToolbar(props: PanelProps) {
  const t = getMessages().listing;
  const { apply } = useApply(props.basePath);
  const count = activeFilterCount(props.filters);
  const [loaded, setLoaded] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-y py-2">
      <Button
        variant="ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className="h-11 gap-2 rounded-none px-0 type-mono-label uppercase lg:invisible"
      >
        <SlidersHorizontal aria-hidden strokeWidth={1.5} />
        {count ? format(t.filterCount, { count }) : t.filter}
      </Button>
      {loaded && <FilterSheet {...props} open={open} onOpenChange={setOpen} />}
      <label className="flex items-center gap-2 text-muted-foreground type-mono-label">
        <span className="uppercase">{t.sortLabel}</span>
        <select
          value={props.filters.sort}
          onChange={(e) =>
            apply({
              ...props.filters,
              sort: e.target.value as ListingFilters["sort"],
            })
          }
          className="h-11 cursor-pointer border-0 bg-transparent text-foreground type-mono-label outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:bg-card"
        >
          {(Object.keys(t.sort) as Array<keyof typeof t.sort>).map((key) => (
            <option key={key} value={key}>
              {t.sort[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
