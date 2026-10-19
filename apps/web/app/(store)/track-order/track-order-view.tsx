"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { normalizeOrderNumber } from "@aaarchive/shared/order-number";
import { normalizeBdPhone } from "@aaarchive/shared/phone-format";
import { ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { format, getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import type { PublicOrder } from "@/lib/order/order-types";
import { useTrackOrder } from "@/lib/order/use-orders";
import { cn } from "@/lib/utils";
import {
  CheckoutField,
  inputClass,
} from "../checkout/_components/checkout-field";

type FormInput = { phone: string; orderNumber: string };

/** The normal path; Cancelled/Returned end the line where they happened. */
const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

/** Track order (PRD §5.9, design §7.6): phone + order number → timeline. */
export function TrackOrderView() {
  const t = getMessages().track;
  const params = useSearchParams();
  const track = useTrackOrder();
  // Same rules as trackOrderSchema, checked without Zod: this page is
  // prefetched from every footer, so it must stay light (rules.md §4.2).
  const form = useForm<FormInput>({
    defaultValues: { phone: "", orderNumber: params.get("order") ?? "" },
  });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit((values) => {
    const phone = normalizeBdPhone(values.phone);
    const orderNumber = normalizeOrderNumber(values.orderNumber);
    if (!phone)
      form.setError("phone", {
        message: values.phone.trim() ? "INVALID_BD_PHONE" : "REQUIRED",
      });
    if (!orderNumber) {
      form.setError("orderNumber", {
        message: values.orderNumber.trim()
          ? "INVALID_ORDER_NUMBER"
          : "REQUIRED",
      });
    }
    if (phone && orderNumber) track.mutate({ phone, orderNumber });
  });

  return (
    <div className="site-container flex flex-col items-center gap-8 py-12 md:py-20">
      <div className="flex w-full max-w-md flex-col gap-6 border bg-card p-5 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="type-display-md">{t.title}</h1>
          <p className="text-muted-foreground type-mono-micro">{t.intro}</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <CheckoutField
            id="tr-phone"
            label={t.phone}
            error={errors.phone?.message}
          >
            <input
              id="tr-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              aria-invalid={Boolean(errors.phone)}
              className={inputClass}
              {...form.register("phone")}
            />
          </CheckoutField>
          <CheckoutField
            id="tr-number"
            label={t.orderNumber}
            hint={t.orderNumberHint}
            error={errors.orderNumber?.message}
          >
            <input
              id="tr-number"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(errors.orderNumber)}
              className={cn(inputClass, "font-mono uppercase")}
              {...form.register("orderNumber")}
            />
          </CheckoutField>
          {track.isError && (
            <p
              role="alert"
              className="border border-destructive p-3 type-mono-label"
            >
              {storeErrorText(track.error)}
            </p>
          )}
          <Button
            type="submit"
            disabled={track.isPending}
            className="h-11 w-full justify-between rounded-none px-3 type-mono-label uppercase"
          >
            {track.isPending ? t.tracking : t.submit}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Button>
        </form>
      </div>
      {track.data && <TrackResult order={track.data} />}
    </div>
  );
}

function TrackResult({ order }: { order: PublicOrder }) {
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
