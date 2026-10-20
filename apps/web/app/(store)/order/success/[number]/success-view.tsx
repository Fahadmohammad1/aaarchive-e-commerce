"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { trackPurchase } from "@/lib/analytics/analytics";
import { useCartStore } from "@/lib/cart/cart-store";
import { format, getMessages } from "@/lib/i18n/i18n";
import { readLastOrder, takePendingPurchase } from "@/lib/order/last-order";
import type { PublicOrder } from "@/lib/order/order-types";

/**
 * Order placed (design §7.5). Details come from this tab's session only.
 * Back from SSLCommerz, `?payment=paid|review` says the API recorded the
 * payment (it only redirects here after asking SSLCommerz).
 */
export function SuccessView({ orderNumber }: { orderNumber: string }) {
  const t = getMessages();
  const ts = t.success;
  const payment = useSearchParams().get("payment");
  const paidOnline = payment === "paid" || payment === "review";
  const clearCart = useCartStore((s) => s.clear);
  const [order, setOrder] = React.useState<PublicOrder | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setOrder(readLastOrder(orderNumber));
  }, [orderNumber]);

  // Online payment: the cart was kept in case the payment failed; now it
  // was paid, empty it and count the purchase (once per order).
  React.useEffect(() => {
    if (!paidOnline) return;
    const purchase = takePendingPurchase(orderNumber);
    if (!purchase) return;
    clearCart();
    trackPurchase(purchase.orderNumber, purchase.total, purchase.items);
  }, [paidOnline, orderNumber, clearCart]);

  return (
    <div className="site-container flex flex-col items-center gap-8 py-12 text-center md:py-20">
      <span
        aria-hidden
        className="flex size-16 items-center justify-center bg-primary text-primary-foreground"
      >
        <Check strokeWidth={2} className="size-8" />
      </span>
      <h1 className="type-display-lg">{ts.title}</h1>

      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground uppercase type-mono-label">
          {ts.number}
        </span>
        <div className="flex items-center gap-2">
          <span className="bg-primary px-3 py-1 font-mono text-2xl text-primary-foreground">
            {orderNumber}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(orderNumber).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="h-9 border border-line-strong px-3 uppercase type-mono-label hover:border-foreground"
          >
            <span aria-live="polite">{copied ? ts.copied : ts.copy}</span>
          </button>
        </div>
      </div>

      {order ? (
        <div className="flex w-full max-w-lg flex-col gap-4 text-left">
          <p className="text-center type-mono-label">
            {format(ts.call, { phone: order.phone })}
          </p>
          {paidOnline ? (
            <p
              role="status"
              className="border border-primary p-3 type-mono-label"
            >
              {payment === "paid" ? ts.paidOnline : ts.reviewOnline}
            </p>
          ) : (
            order.paymentStatus === "PENDING_VERIFICATION" && (
              <p
                role="status"
                className="border border-primary p-3 type-mono-label"
              >
                {ts.pending}
              </p>
            )
          )}
          {order.payOnDelivery > 0 && (
            <p className="text-center text-muted-foreground type-mono-micro">
              {format(ts.payOnDelivery, {
                amount: formatTaka(order.payOnDelivery),
              })}
            </p>
          )}
          <div className="border bg-card p-5">
            <ul className="flex flex-col gap-2">
              {order.items.map((item) => (
                <li
                  key={`${item.productName}-${item.sizeName}-${item.colorName}`}
                  className="flex justify-between gap-3 type-mono-label"
                >
                  <span className="min-w-0">
                    {item.productName}
                    <span className="block text-muted-foreground type-mono-micro">
                      {format(t.cart.variant, {
                        color: item.colorName,
                        size: item.sizeName,
                      })}{" "}
                      × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0">{formatTaka(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-2 border-t pt-4 type-mono-label">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.checkout.subtotal}</dt>
                <dd>{formatTaka(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t.checkout.discount}
                  </dt>
                  <dd>−{formatTaka(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t.checkout.deliveryCharge} ({order.zone.name})
                </dt>
                <dd>{formatTaka(order.deliveryCharge)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-base">
                <dt>{t.checkout.total}</dt>
                <dd>{formatTaka(order.total)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <p className="max-w-md text-muted-foreground type-mono-label">
          {ts.missing}
        </p>
      )}

      <div className="flex w-full max-w-lg flex-col gap-2 sm:flex-row">
        <Button
          asChild
          className="h-11 justify-between sm:flex-1 rounded-none px-3 type-mono-label uppercase"
        >
          <Link href={`/track-order?order=${encodeURIComponent(orderNumber)}`}>
            {ts.track}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-none border-line-strong sm:flex-1 type-mono-label uppercase"
        >
          <Link href="/shop">{ts.continue}</Link>
        </Button>
      </div>
    </div>
  );
}
