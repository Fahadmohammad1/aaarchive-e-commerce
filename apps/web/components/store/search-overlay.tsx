"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, getMessages } from "@/lib/i18n/i18n";
import { useInstantSearch } from "@/lib/product/use-store-products";
import { MediaImage } from "./media-image";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/**
 * Header search (PRD §5.4): 6 instant results, Enter opens /search. Loaded
 * on the first tap of the header's search button (site-header.tsx).
 */
export function SearchDialog({
  open,
  onOpenChange: setOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = getMessages().search;
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const term = useDebounced(q, 300);
  const results = useInstantSearch(term);
  const items = term.trim().length >= 2 ? (results.data?.data ?? []) : [];
  const total = results.data?.meta.total ?? 0;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-0 max-h-dvh w-full max-w-none translate-y-0 gap-0 rounded-none border-b bg-background p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t.title}</DialogTitle>
        <DialogDescription className="sr-only">{t.hint}</DialogDescription>
        <div className="site-container py-4">
          <search>
            <form
              className="flex items-center gap-3 border-b border-line-strong"
              onSubmit={(e) => {
                e.preventDefault();
                const term = q.trim();
                if (term) go(`/search?q=${encodeURIComponent(term)}`);
              }}
            >
              <Search
                aria-hidden
                strokeWidth={1.5}
                className="size-5 text-muted-foreground"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.placeholder}
                aria-label={t.label}
                maxLength={80}
                autoFocus
                className="h-14 flex-1 bg-transparent type-display-sm outline-none placeholder:text-subtle"
              />
              <DialogClose
                aria-label={t.close}
                className="flex size-8 items-center justify-center bg-primary text-primary-foreground"
              >
                <X aria-hidden strokeWidth={1.5} className="size-4" />
              </DialogClose>
            </form>
          </search>

          <div aria-live="polite" className="py-4">
            {term.trim().length < 2 ? (
              <p className="text-muted-foreground type-mono-micro">{t.hint}</p>
            ) : results.isPending ? (
              <p className="text-muted-foreground type-mono-micro">
                {t.searching}
              </p>
            ) : items.length === 0 ? (
              <p className="type-mono-label">
                {format(t.noResults, { q: term.trim() })}
              </p>
            ) : (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/product/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 p-1 hover:bg-card"
                      >
                        <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-sunken">
                          {p.image && (
                            <MediaImage
                              media={p.image.media}
                              alt=""
                              sizes="56px"
                              fill
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate type-display-sm">
                            {p.name}
                          </span>
                          <span className="text-muted-foreground type-mono-micro">
                            {p.category.name} · {formatTaka(p.price)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                {total > items.length && (
                  <button
                    type="button"
                    onClick={() =>
                      go(`/search?q=${encodeURIComponent(term.trim())}`)
                    }
                    className="mt-4 min-h-11 underline-offset-4 type-mono-label hover:underline"
                  >
                    {t.seeAll} ({total}) ↗
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
