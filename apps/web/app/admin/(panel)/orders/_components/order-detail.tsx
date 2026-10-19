"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { ArrowLeft, MessageCircle, Pencil, Phone, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { Button } from "@/components/ui/button";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminOrder } from "@/lib/order/order-schemas";
import { useOrder } from "@/lib/order/use-admin-orders";
import { CallAndNotes } from "./call-and-notes";
import { EditOrderDialog } from "./edit-order-dialog";
import { formatDateTime } from "./format";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-badges";
import { OrderHistory } from "./order-history";
import { PaymentRecordCard } from "./payment-panel";
import { StatusActions } from "./status-actions";

export function OrderDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <OrderDetail id={id} />;
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Whatsapp wants the number with the country code and no leading 0. */
const waLink = (phone: string) => `https://wa.me/88${phone}`;

export function OrderDetail({ id }: { id: string }) {
  const t = getAdminMessages();
  const to = t.orders;
  const order = useOrder(id);
  const [editing, setEditing] = React.useState(false);

  if (order.isPending) return <ListSkeleton rows={8} />;
  if (order.isError)
    return <ListError error={order.error} onRetry={() => order.refetch()} />;
  const o: AdminOrder = order.data;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/orders"
        className="flex min-h-11 w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {to.back}
      </Link>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono font-semibold text-2xl">{o.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            {format(to.placed, { date: formatDateTime(o.createdAt) })}
          </p>
          <div className="flex flex-wrap gap-1">
            <OrderStatusBadge status={o.status} />
            <PaymentStatusBadge status={o.paymentStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {o.editable && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setEditing(true)}
            >
              <Pencil />
              {to.edit}
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <Link href={`/admin/orders/print?kind=invoice&ids=${o.id}`}>
              <Printer />
              {to.printInvoice}
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={`/admin/orders/print?kind=slip&ids=${o.id}`}>
              <Printer />
              {to.printSlip}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* On phones the next step and the customer come first. */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <Section title={to.itemsTitle}>
            <ul className="flex flex-col divide-y">
              {o.items.map((i) => (
                <li
                  key={i.id}
                  className="flex justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block">{i.productName}</span>
                    <span className="block text-muted-foreground text-xs">
                      {i.colorName} / {i.sizeName} ·{" "}
                      <span className="font-mono">{i.sku}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-mono">
                    <span className="block">{formatTaka(i.lineTotal)}</span>
                    <span className="block text-muted-foreground text-xs">
                      {i.quantity} × {formatTaka(i.unitPrice)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{to.subtotal}</dt>
                <dd className="font-mono">{formatTaka(o.subtotal)}</dd>
              </div>
              {o.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {o.couponCode
                      ? format(to.coupon, { code: o.couponCode })
                      : to.discount}
                  </dt>
                  <dd className="font-mono">−{formatTaka(o.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {to.delivery} ({o.zone.name})
                </dt>
                <dd className="font-mono">{formatTaka(o.deliveryCharge)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-base">
                <dt>{to.total}</dt>
                <dd className="font-mono">{formatTaka(o.total)}</dd>
              </div>
            </dl>
          </Section>

          <Section title={to.paymentTitle}>
            <p className="text-sm">
              {t.paymentMethod[o.paymentMethod]} ·{" "}
              {t.paymentStatus[o.paymentStatus]}
            </p>
            {o.payments.map((p) => (
              <PaymentRecordCard
                key={p.id}
                payment={p}
                isAdvance={o.paymentMethod === "COD"}
              />
            ))}
          </Section>

          <Section title={to.history}>
            <OrderHistory events={o.events} />
          </Section>
        </div>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <Section title={to.actions}>
            <StatusActions order={o} onConflict={() => void order.refetch()} />
            {o.courierName && (
              <p className="text-sm">
                {to.courier}: {o.courierName}
                {o.trackingNumber && (
                  <span className="font-mono"> · {o.trackingNumber}</span>
                )}
              </p>
            )}
          </Section>

          <Section
            title={to.contact}
            action={
              <Link
                href={`/admin/customers/${o.phone}`}
                className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
              >
                {to.viewCustomer}
              </Link>
            }
          >
            <p className="font-medium">{o.customerName}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" className="h-12" asChild>
                <a href={`tel:${o.phone}`}>
                  <Phone />
                  {to.call}
                </a>
              </Button>
              <Button variant="outline" size="lg" className="h-12" asChild>
                <a
                  href={waLink(o.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  {to.whatsapp}
                </a>
              </Button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t.customers.phone}</dt>
              <dd className="font-mono">{o.phone}</dd>
              {o.altPhone && (
                <>
                  <dt className="text-muted-foreground">{to.altPhone}</dt>
                  <dd className="font-mono">
                    <a href={`tel:${o.altPhone}`} className="hover:underline">
                      {o.altPhone}
                    </a>
                  </dd>
                </>
              )}
              {o.email && (
                <>
                  <dt className="text-muted-foreground">{to.email}</dt>
                  <dd className="break-all">{o.email}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{to.address}</dt>
              <dd>
                {o.address}, {o.area}, {o.district}
              </dd>
              <dt className="text-muted-foreground">{to.zone}</dt>
              <dd>{o.zone.name}</dd>
            </dl>
            {o.note && (
              <p className="rounded-md bg-muted p-2 text-sm">
                <span className="block text-muted-foreground text-xs">
                  {to.customerNote}
                </span>
                {o.note}
              </p>
            )}
          </Section>

          <Section title={to.callsTitle}>
            <CallAndNotes orderId={o.id} />
          </Section>
        </div>
      </div>

      {o.editable && (
        <EditOrderDialog order={o} open={editing} onOpenChange={setEditing} />
      )}
    </div>
  );
}
