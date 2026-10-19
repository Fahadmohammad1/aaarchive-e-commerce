import { formatTaka } from "@aaarchive/shared/money";
import { MediaImage } from "@/components/store/media-image";
import type { CartLine } from "@/lib/cart/cart-store";
import type { ValidatedCart } from "@/lib/cart/cart-types";
import { format, getMessages } from "@/lib/i18n/i18n";

export type SummaryTotals = {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  /** null until a zone is chosen. */
  deliveryCharge: number | null;
  total: number;
};

/** Items and money as the API priced them (the order is priced again on submit). */
export function OrderSummary({
  lines,
  cart,
  totals,
}: {
  lines: CartLine[];
  cart: ValidatedCart | undefined;
  totals: SummaryTotals;
}) {
  const t = getMessages();
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {lines.map((line) => {
          const v = cart?.items.find((i) => i.variantId === line.variantId);
          const image = v?.image ?? line.snapshot.image;
          const unit = v?.unitPrice ?? line.snapshot.unitPrice;
          return (
            <li key={line.variantId} className="flex gap-3">
              <div className="relative h-15 w-12 shrink-0 overflow-hidden bg-sunken">
                {image && (
                  <MediaImage
                    media={image.media}
                    alt={image.alt || line.snapshot.name}
                    sizes="48px"
                    fill
                    className="object-cover"
                  />
                )}
                <span className="absolute top-0 right-0 bg-primary px-1 text-primary-foreground type-mono-micro">
                  {line.quantity}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate type-mono-label">
                    {v?.product.name ?? line.snapshot.name}
                  </p>
                  <p className="text-muted-foreground type-mono-micro">
                    {format(t.cart.variant, {
                      color: v?.colorName ?? line.snapshot.colorName,
                      size: v?.sizeName ?? line.snapshot.sizeName,
                    })}
                  </p>
                </div>
                <span className="shrink-0 type-mono-label">
                  {formatTaka(unit * line.quantity)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="flex flex-col gap-2 border-t pt-4 type-mono-label">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.checkout.subtotal}</dt>
          <dd>{formatTaka(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {t.checkout.discount}
              {totals.couponCode && ` (${totals.couponCode})`}
            </dt>
            <dd>−{formatTaka(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.checkout.deliveryCharge}</dt>
          <dd
            className={
              totals.deliveryCharge == null ? "text-muted-foreground" : ""
            }
          >
            {totals.deliveryCharge == null
              ? t.checkout.chooseZone
              : totals.deliveryCharge === 0
                ? t.checkout.free
                : formatTaka(totals.deliveryCharge)}
          </dd>
        </div>
        <div className="flex justify-between border-t pt-3 text-base">
          <dt>{t.checkout.total}</dt>
          <dd>{formatTaka(totals.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
