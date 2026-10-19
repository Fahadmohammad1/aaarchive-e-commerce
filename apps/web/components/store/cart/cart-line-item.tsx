"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { MediaImage } from "@/components/store/media-image";
import type { CartLine } from "@/lib/cart/cart-store";
import type { ValidatedCartLine } from "@/lib/cart/cart-types";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

/** One cart row (design §7.3): 64×80 photo, name, colour / size, price, stepper, remove. */
export function CartLineItem({
  line,
  validated,
  max,
  problem,
  onQuantity,
  onRemove,
  onNavigate,
}: {
  line: CartLine;
  validated: ValidatedCartLine | undefined;
  max: number;
  /** A notice for this line, already worded. */
  problem: string | null;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  const t = getMessages();
  const s = line.snapshot;
  const name = validated?.product.name ?? s.name;
  const unitPrice = validated?.unitPrice ?? s.unitPrice;
  const image = validated?.image ?? s.image;
  const out = validated?.stockStatus === "out_of_stock";

  return (
    <li className="flex gap-3 border-b py-4">
      <Link
        href={`/product/${validated?.product.slug ?? s.slug}`}
        onClick={onNavigate}
        className="relative block h-20 w-16 shrink-0 overflow-hidden bg-sunken"
      >
        {image && (
          <MediaImage
            media={image.media}
            alt={image.alt || name}
            sizes="64px"
            fill
            className={cn("object-cover", out && "opacity-50")}
          />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/product/${validated?.product.slug ?? s.slug}`}
            onClick={onNavigate}
            className="line-clamp-2 type-display-sm text-xs hover:text-primary"
          >
            {name}
          </Link>
          <span className="shrink-0 type-mono-label">
            {formatTaka(unitPrice * line.quantity)}
          </span>
        </div>
        <p className="text-muted-foreground type-mono-micro">
          {format(t.cart.variant, {
            color: validated?.colorName ?? s.colorName,
            size: validated?.sizeName ?? s.sizeName,
          })}
          {line.quantity > 1 &&
            ` · ${format(t.cart.each, { price: formatTaka(unitPrice) })}`}
        </p>
        {problem && (
          <p role="alert" className="text-destructive type-mono-micro">
            {problem}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex h-9 items-center border border-line-strong">
            <button
              type="button"
              aria-label={t.pdp.decrease}
              disabled={line.quantity <= 1}
              onClick={() => onQuantity(line.quantity - 1)}
              className="flex size-9 items-center justify-center disabled:opacity-40"
            >
              <Minus aria-hidden strokeWidth={1.5} className="size-3.5" />
            </button>
            <output
              aria-live="polite"
              className="w-7 text-center type-mono-label"
            >
              {line.quantity}
            </output>
            <button
              type="button"
              aria-label={t.pdp.increase}
              disabled={line.quantity >= max || out}
              onClick={() => onQuantity(line.quantity + 1)}
              className="flex size-9 items-center justify-center disabled:opacity-40"
            >
              <Plus aria-hidden strokeWidth={1.5} className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={format(t.cart.removeItem, { name })}
            className="min-h-9 text-muted-foreground underline-offset-4 type-mono-micro hover:text-foreground hover:underline"
          >
            {t.cart.remove}
          </button>
        </div>
      </div>
    </li>
  );
}
