"use client";

import { formatTaka } from "@aaarchive/shared/money";
import type { StockStatus } from "@aaarchive/shared/stock";
import { Minus, Plus, Ruler } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { format, getMessages } from "@/lib/i18n/i18n";
import type {
  StoreProduct,
  StoreProductStock,
} from "@/lib/product/product-store-schemas";
import { cn } from "@/lib/utils";
import { useProductSelection } from "./product-selection";

const SizeChartDialog = dynamic(
  () => import("./size-chart-dialog").then((m) => m.SizeChartDialog),
  { ssr: false },
);

/** "Size chart ↗": the dialog's code loads on the first tap. */
function SizeChartButton({
  chart,
}: {
  chart: { columns: string[]; rows: string[][] };
}) {
  const t = getMessages().pdp;
  const [loaded, setLoaded] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center gap-1.5 text-muted-foreground underline-offset-4 type-mono-label hover:text-foreground hover:underline"
      >
        <Ruler aria-hidden strokeWidth={1.5} className="size-4" />
        {t.sizeChart} ↗
      </button>
      {loaded && (
        <SizeChartDialog chart={chart} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}

const STATUS_DOT: Record<StockStatus, string> = {
  in_stock: "bg-success",
  low_stock: "bg-primary",
  out_of_stock: "bg-destructive",
};

/** "● Only a few left" (design §5.14). Never a number. */
function StatusLine({ status }: { status: StockStatus }) {
  const t = getMessages().pdp;
  return (
    <p className="flex items-center gap-2 type-mono-label" aria-live="polite">
      <span
        aria-hidden
        className={cn("size-2 rounded-full", STATUS_DOT[status])}
      />
      {t.status[status]}
    </p>
  );
}

/**
 * Colour, size, status, quantity and the buy buttons (PRD §5.5). Rendered in
 * the request-time hole with that moment's stock status; the cart itself
 * arrives in Phase 4.
 */
export function VariantPicker({
  product,
  stock,
}: {
  product: StoreProduct;
  /** null when the status could not be loaded: nothing can be chosen. */
  stock: StoreProductStock | null;
}) {
  const t = getMessages().pdp;
  const { colorId, setColorId } = useProductSelection();
  const status = React.useMemo(
    () => new Map(stock?.variants.map((v) => [v.id, v.stockStatus])),
    [stock],
  );
  const [sizeId, setSizeId] = React.useState<string | null>(
    product.sizes.length === 1 ? (product.sizes[0]?.id ?? null) : null,
  );
  const [qty, setQty] = React.useState(1);
  const buyRef = React.useRef<HTMLDivElement>(null);
  const [buyVisible, setBuyVisible] = React.useState(true);

  const variantFor = (size: string | null, color: string | null) =>
    product.variants.find((v) => v.sizeId === size && v.colorId === color);
  const statusOf = (size: string) => {
    const v = variantFor(size, colorId);
    return v ? (status.get(v.id) ?? "out_of_stock") : "out_of_stock";
  };
  const variant = variantFor(sizeId, colorId);
  const variantStatus = variant ? status.get(variant.id) : undefined;
  const color = product.colors.find((c) => c.id === colorId);

  // A size sold out in the newly picked colour is unpicked.
  // biome-ignore lint/correctness/useExhaustiveDependencies: recheck on colour change
  React.useEffect(() => {
    if (sizeId && statusOf(sizeId) === "out_of_stock") setSizeId(null);
  }, [colorId]);

  // The sticky phone bar shows while the main buttons are off-screen.
  React.useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setBuyVisible(Boolean(entry?.isIntersecting)),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Lift the floating chat buttons above the sticky bar while it shows
  // (phones only: the bar is md:hidden).
  React.useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia("(max-width: 47.99rem)").matches;
    root.style.setProperty(
      "--buy-bar-h",
      !buyVisible && phone ? "4.5rem" : "0px",
    );
    return () => {
      root.style.removeProperty("--buy-bar-h");
    };
  }, [buyVisible]);

  const price = variant?.price ?? product.price;
  const showVariantPrice = variant && variant.price !== product.price;

  return (
    <div className="flex flex-col gap-6">
      {stock === null ? (
        <p
          role="alert"
          className="border border-destructive p-3 type-mono-label"
        >
          {t.statusFailed}
        </p>
      ) : (
        variantStatus && <StatusLine status={variantStatus} />
      )}

      {product.colors.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 type-mono-label uppercase">
            {t.color}
            {color && (
              <span className="text-muted-foreground"> — {color.name}</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-3">
            {product.colors.map((c) => (
              <label
                key={c.id}
                className="relative flex size-11 cursor-pointer items-center justify-center"
              >
                <input
                  type="radio"
                  name="color"
                  value={c.id}
                  checked={c.id === colorId}
                  onChange={() => setColorId(c.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="size-6 rounded-full border border-line-strong peer-checked:ring-2 peer-checked:ring-foreground peer-checked:ring-offset-2 peer-checked:ring-offset-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.sizes.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <legend className="type-mono-label uppercase">{t.size}</legend>
            {product.sizeChart && <SizeChartButton chart={product.sizeChart} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const out = stock === null || statusOf(s.id) === "out_of_stock";
              return (
                <label
                  key={s.id}
                  className={cn(
                    "relative",
                    out ? "cursor-not-allowed" : "cursor-pointer",
                  )}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s.id}
                    checked={s.id === sizeId}
                    disabled={out}
                    onChange={() => setSizeId(s.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "relative flex h-11 min-w-11 items-center justify-center overflow-hidden border px-2 type-mono-label peer-focus-visible:outline-2 peer-focus-visible:outline-ring",
                      "border-line-strong peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background",
                      out && "text-subtle",
                    )}
                  >
                    {s.name}
                    {out && (
                      // The diagonal strike line (design §5.12).
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--subtle)_50%,transparent_calc(50%+0.5px))]"
                      />
                    )}
                  </span>
                  {out && (
                    <span className="sr-only">
                      {format(t.unavailable, { size: s.name })}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {!variant && stock !== null && (
            <p className="text-muted-foreground type-mono-micro">
              {t.chooseSize}
            </p>
          )}
          {showVariantPrice && (
            <p className="type-mono-label">
              {formatTaka(variant.price)}
              {variant.compareAt && (
                <s className="ml-2 text-subtle">
                  {formatTaka(variant.compareAt)}
                </s>
              )}
            </p>
          )}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 type-mono-label uppercase">{t.quantity}</legend>
        <div className="flex items-center gap-3">
          <div className="flex h-11 items-center border border-line-strong">
            <button
              type="button"
              aria-label={t.decrease}
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex size-11 items-center justify-center disabled:opacity-40"
            >
              <Minus aria-hidden strokeWidth={1.5} className="size-4" />
            </button>
            <output
              aria-live="polite"
              className="w-8 text-center type-mono-label"
            >
              {qty}
            </output>
            <button
              type="button"
              aria-label={t.increase}
              disabled={qty >= product.maxQtyPerVariant}
              onClick={() =>
                setQty((q) => Math.min(product.maxQtyPerVariant, q + 1))
              }
              className="flex size-11 items-center justify-center disabled:opacity-40"
            >
              <Plus aria-hidden strokeWidth={1.5} className="size-4" />
            </button>
          </div>
          <span className="text-muted-foreground type-mono-micro">
            {format(t.maxQty, { max: product.maxQtyPerVariant })}
          </span>
        </div>
      </fieldset>

      <div ref={buyRef} className="flex flex-col gap-2">
        {/* TODO(Phase 4): add to the cart / go to checkout with { variantId, qty }. */}
        <Button
          disabled
          aria-describedby="ordering-soon"
          className="h-11 w-full justify-between rounded-none type-mono-label uppercase"
        >
          {t.addToCart} <span aria-hidden>↗</span>
        </Button>
        <Button
          disabled
          variant="outline"
          aria-describedby="ordering-soon"
          className="h-11 w-full rounded-none type-mono-label uppercase"
        >
          {t.buyNow}
        </Button>
        <p id="ordering-soon" className="text-muted-foreground type-mono-micro">
          {t.orderingSoon}
        </p>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-sm transition-transform duration-250 md:hidden",
          buyVisible ? "translate-y-full" : "translate-y-0",
        )}
        aria-hidden={buyVisible}
      >
        <span className="type-mono-label">{formatTaka(price)}</span>
        <Button
          disabled
          tabIndex={buyVisible ? -1 : 0}
          className="h-11 flex-1 justify-between rounded-none type-mono-label uppercase"
        >
          {t.addToCart} <span aria-hidden>↗</span>
        </Button>
      </div>
    </div>
  );
}
