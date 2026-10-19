"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { DEFAULT_MAX_QTY_PER_VARIANT } from "@aaarchive/shared/stock-limits";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCartHydrated, useCartStore } from "@/lib/cart/cart-store";
import type { CartNoticeCode } from "@/lib/cart/cart-types";
import { useCartValidation } from "@/lib/cart/use-cart-validation";
import { useCouponQuote } from "@/lib/cart/use-coupon-quote";
import { format, getMessages } from "@/lib/i18n/i18n";
import { CartLineItem } from "./cart-line-item";
import { CouponField } from "./coupon-field";

/** Notices that stop checkout until the customer fixes the line. */
const BLOCKING: CartNoticeCode[] = ["OUT_OF_STOCK", "NOT_ENOUGH_STOCK"];

/**
 * Cart contents for the drawer and the /cart page (design §7.3): lines,
 * notices from the API's re-check, coupon, subtotal, Checkout.
 */
export function CartView({ onNavigate }: { onNavigate?: () => void }) {
  const t = getMessages();
  const lines = useCartStore((s) => s.lines);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const validation = useCartValidation();
  const quote = useCouponQuote(couponCode, validation.items);
  const data = validation.data;
  const max = data?.maxQtyPerVariant ?? DEFAULT_MAX_QTY_PER_VARIANT;
  const hydrated = useCartHydrated();

  if (!hydrated) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4 py-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-20 w-16" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <p aria-hidden className="wordmark-outline type-display-xl">
          {t.cart.empty}
        </p>
        <p className="text-muted-foreground type-mono-label">
          {t.cart.emptyText}
        </p>
        <Button
          asChild
          className="h-11 min-w-48 justify-between rounded-none px-3 type-mono-label uppercase"
        >
          <Link href="/shop" onClick={onNavigate}>
            {t.cart.startShopping}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Link>
        </Button>
      </div>
    );
  }

  const noticeFor = (variantId: string, name: string): string | null => {
    const notice = data?.notices.find((n) => n.variantId === variantId);
    if (notice && notice.code !== "UNAVAILABLE") {
      return format(t.cart.notices[notice.code], { name, max });
    }
    const changed = validation.priceChanges[variantId];
    return changed != null
      ? format(t.cart.notices.PRICE_CHANGED, {
          name,
          price: formatTaka(changed),
        })
      : null;
  };
  const blocked = Boolean(data?.notices.some((n) => BLOCKING.includes(n.code)));
  const removedSome = Boolean(
    data?.notices.some((n) => n.code === "UNAVAILABLE"),
  );
  const subtotal =
    data?.subtotal ??
    lines.reduce((sum, l) => sum + l.snapshot.unitPrice * l.quantity, 0);
  const discount = quote.data?.discount ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {removedSome && (
          <p
            role="status"
            className="border border-destructive p-3 type-mono-micro"
          >
            {t.cart.notices.UNAVAILABLE}
          </p>
        )}
        {validation.isError && (
          <p
            role="status"
            className="mt-2 text-muted-foreground type-mono-micro"
          >
            {t.cart.checkFailed}
          </p>
        )}
        <ul aria-busy={validation.isFetching}>
          {lines.map((line) => {
            const validated = data?.items.find(
              (i) => i.variantId === line.variantId,
            );
            return (
              <CartLineItem
                key={line.variantId}
                line={line}
                validated={validated}
                max={max}
                problem={noticeFor(
                  line.variantId,
                  validated?.product.name ?? line.snapshot.name,
                )}
                onQuantity={(q) =>
                  setQuantity(line.variantId, Math.min(q, max))
                }
                onRemove={() => remove(line.variantId)}
                onNavigate={onNavigate}
              />
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-4 border-t pt-4">
        <CouponField
          code={couponCode}
          onCode={setCoupon}
          quote={quote.data}
          pending={quote.isFetching}
          error={quote.error}
        />
        <dl className="flex flex-col gap-2 type-mono-label">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.cart.subtotal}</dt>
            <dd>{formatTaka(subtotal)}</dd>
          </div>
          {discount > 0 && quote.data && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {format(t.cart.discount, { code: quote.data.code })}
              </dt>
              <dd>−{formatTaka(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.cart.delivery}</dt>
            <dd className="text-muted-foreground">
              {t.cart.deliveryAtCheckout}
            </dd>
          </div>
        </dl>
        {blocked && (
          <p role="alert" className="text-destructive type-mono-micro">
            {t.cart.blocked}
          </p>
        )}
        {blocked ? (
          <Button
            disabled
            className="h-11 w-full justify-between rounded-none px-3 type-mono-label uppercase"
          >
            {t.cart.checkout}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Button>
        ) : (
          <Button
            asChild
            className="h-11 w-full justify-between rounded-none px-3 type-mono-label uppercase"
          >
            <Link href="/checkout" onClick={onNavigate}>
              {t.cart.checkout}
              <ArrowUpRight aria-hidden strokeWidth={1.5} />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
