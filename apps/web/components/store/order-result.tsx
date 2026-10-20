import { formatTaka } from "@aaarchive/shared/money";
import { ArrowUpRight } from "lucide-react";
import { format, getMessages } from "@/lib/i18n/i18n";
import type { PublicOrder } from "@/lib/order/order-types";
import { cn } from "@/lib/utils";

// One order's status timeline, courier, items and payment (design §7.6).
// Used by /track-order and the account's order page.

/** The normal path; Cancelled/Returned end the line where they happened. */
const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

export function OrderResult({ order }: { order: PublicOrder }) {
  const t = getMessages();
  const tt = t.track;
  const reached = new Map(order.timeline.map((e) => [e.status, e.at]));
  const ended = order.status === "CANCELLED" || order.status === "RETURNED";
  // Steps to draw: the normal path, or the path up to where it stopped.
  const steps = ended ? [...order.timeline.map((e) => e.status)] : FLOW;
  const currentIndex = steps.indexOf(order.status);

  return (
    <section
      aria-live="polite"
      className="flex w-full max-w-md flex-col gap-6 border p-5 md:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xl">{order.orderNumber}</h2>
        <span className="text-muted-foreground type-mono-micro">
          {format(tt.placedOn, {
            date: dateTime.format(new Date(order.createdAt)),
          })}
        </span>
      </div>

      <ol className="flex flex-col">
        {steps.map((status, i) => {
          const done = i < currentIndex || (i === currentIndex && ended);
          const current = i === currentIndex && !ended;
          const at = reached.get(status);
          return (
            <li key={status} className="relative flex gap-4 pb-5 last:pb-0">
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-4 left-[7px] h-full w-px",
                    i < currentIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative mt-0.5 size-4 shrink-0 border",
                  done && "border-primary bg-primary",
                  current &&
                    "border-primary bg-background motion-safe:animate-pulse",
                  !done && !current && "border-border",
                )}
              />
              <div className="flex flex-col">
                <span
                  className={cn(
                    "type-mono-label",
                    !done && !current && "text-subtle",
                  )}
                >
                  {tt.statuses[status as keyof typeof tt.statuses] ?? status}
                  {current && <span className="sr-only"> (current)</span>}
                </span>
                {at && (
                  <span className="text-muted-foreground type-mono-micro">
                    {dateTime.format(new Date(at))}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {order.courier && (
        <dl className="flex flex-col gap-1 border-t pt-4 type-mono-label">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{tt.courier}</dt>
            <dd>{order.courier.name}</dd>
          </div>
          {order.courier.trackingNumber && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{tt.trackingNumber}</dt>
              <dd className="font-mono">{order.courier.trackingNumber}</dd>
            </div>
          )}
          {order.courier.trackingUrl && (
            <a
              href={order.courier.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex min-h-11 items-center justify-between border border-line-strong px-3 uppercase type-mono-label hover:border-foreground"
            >
              {format(tt.trackParcel, { courier: order.courier.name })}
              <ArrowUpRight aria-hidden strokeWidth={1.5} className="size-4" />
            </a>
          )}
        </dl>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <span className="uppercase type-mono-label">{tt.items}</span>
        <ul className="flex flex-col gap-1">
          {order.items.map((item) => (
            <li
              key={`${item.productName}-${item.sizeName}-${item.colorName}`}
              className="flex justify-between gap-3 type-mono-micro"
            >
              <span>
                {item.productName} ·{" "}
                {format(t.cart.variant, {
                  color: item.colorName,
                  size: item.sizeName,
                })}{" "}
                × {item.quantity}
              </span>
              <span>{formatTaka(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="flex flex-col gap-1 border-t pt-4 type-mono-label">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{tt.payment}</dt>
          <dd>
            {tt.methods[order.paymentMethod]} ·{" "}
            {tt.paymentStatuses[order.paymentStatus]}
          </dd>
        </div>
        <div className="flex justify-between gap-2 text-base">
          <dt>{t.checkout.total}</dt>
          <dd>{formatTaka(order.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
