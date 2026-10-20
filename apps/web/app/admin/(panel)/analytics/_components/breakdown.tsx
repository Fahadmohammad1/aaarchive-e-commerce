import { cn } from "cn";
import Link from "next/link";
import type * as React from "react";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("flex flex-col gap-3 rounded-md border p-4", className)}
    >
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export type BarListItem = {
  key: string;
  label: string;
  /** Drives the bar length. */
  value: number;
  /** Shown on the right, e.g. "৳12,400 · 9 orders". */
  valueText: string;
  href?: string;
};

/**
 * Ranked horizontal bars (single hue, longest first). Every value is written
 * out, so the bar is a visual aid and nothing depends on colour.
 */
export function BarList({ items }: { items: BarListItem[] }) {
  const t = getAdminMessages().analytics;
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t.none}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const row = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 font-mono text-muted-foreground text-xs">
                {item.valueText}
              </span>
            </span>
            <span aria-hidden className="mt-1 block h-1.5 rounded-sm bg-sunken">
              <span
                className="block h-full rounded-sm bg-primary"
                style={{ width: `${Math.max((item.value / max) * 100, 1)}%` }}
              />
            </span>
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                className="-mx-2 block rounded px-2 py-1 hover:bg-accent"
              >
                {row}
              </Link>
            ) : (
              <div className="py-1">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
