"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/lib/category/use-categories";
import { fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useProducts } from "@/lib/product/use-products";

type Option = { id: string; name: string };

/** Checkbox list of the categories or products a coupon applies to. */
export function ScopePicker({
  kind,
  value,
  onChange,
  error,
}: {
  kind: "category" | "product";
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const tc = getAdminMessages().coupons;
  const [q, setQ] = React.useState("");
  const categories = useCategories();
  const products = useProducts({ q: q.trim() || undefined, limit: 50 });
  const options: Option[] =
    kind === "category"
      ? (categories.data?.data ?? []).map((c) => ({ id: c.id, name: c.name }))
      : (products.data?.data ?? []).map((p) => ({ id: p.id, name: p.name }));

  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...value, id] : value.filter((v) => v !== id));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">
        {kind === "category" ? tc.pickCategories : tc.pickProducts}{" "}
        <span className="font-normal text-muted-foreground">
          ({format(tc.selected, { count: value.length })})
        </span>
      </legend>
      {kind === "product" && (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tc.searchProducts}
            aria-label={tc.searchProducts}
            className="h-11 pl-8"
          />
        </div>
      )}
      <ul className="max-h-56 overflow-y-auto rounded-md border">
        {options.map((o) => {
          const id = `scope-${o.id}`;
          return (
            <li key={o.id} className="flex min-h-11 items-center gap-3 px-3">
              <input
                id={id}
                type="checkbox"
                className="size-4 accent-primary"
                checked={value.includes(o.id)}
                onChange={(e) => toggle(o.id, e.target.checked)}
              />
              <Label htmlFor={id} className="flex-1 font-normal">
                {o.name}
              </Label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-destructive text-xs">{fieldErrorText(error)}</p>
      )}
    </fieldset>
  );
}
