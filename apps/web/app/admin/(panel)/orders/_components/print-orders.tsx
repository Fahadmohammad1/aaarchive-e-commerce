"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminOrder } from "@/lib/order/order-schemas";
import { useOrdersByIds } from "@/lib/order/use-admin-orders";
import { formatDate } from "./format";

type Kind = "invoice" | "slip";

/**
 * Invoices / packing slips (PRD §6.4): one page per order, ink on white,
 * printed or saved as PDF by the browser. The dashboard chrome is hidden in
 * print (admin-shell.tsx).
 */
export function PrintOrders() {
  const t = getAdminMessages().orders;
  const params = useSearchParams();
  const kind: Kind = params.get("kind") === "invoice" ? "invoice" : "slip";
  const ids = (params.get("ids") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 100);
  const queries = useOrdersByIds(ids);

  if (ids.length === 0) return <ListEmpty>{t.printEmpty}</ListEmpty>;
  if (queries.some((q) => q.isPending)) return <ListSkeleton rows={6} />;
  const failed = queries.find((q) => q.isError);
  if (failed)
    return <ListError error={failed.error} onRetry={() => failed.refetch()} />;
  const orders = queries
    .map((q) => q.data)
    .filter((o): o is AdminOrder => Boolean(o));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/admin/orders"
          className="flex min-h-11 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t.back}
        </Link>
        <Button size="lg" onClick={() => window.print()}>
          <Printer />
          {t.printNow}
        </Button>
      </div>
      {orders.map((o) => (
        <PrintedOrder key={o.id} order={o} kind={kind} />
      ))}
    </div>
  );
}

function PrintedOrder({ order: o, kind }: { order: AdminOrder; kind: Kind }) {
  const t = getAdminMessages();
  const to = t.orders;
  const invoice = kind === "invoice";
  const collect =
    o.paymentMethod === "COD"
      ? o.total -
        o.payments
          .filter((p) => p.status !== "REJECTED")
          .reduce((sum, p) => sum + p.amount, 0)
      : 0;

  return (
    <article className="mx-auto w-full max-w-[720px] break-after-page rounded-md bg-paper p-8 text-ink print:max-w-none print:rounded-none print:p-0">
      <header className="mb-6 flex items-start justify-between gap-4 border-ink border-b pb-4">
        <div className="rounded bg-ink p-2">
          <Logo sizes="120px" className="h-8 w-auto" />
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg uppercase tracking-wide">
            {invoice ? to.invoiceTitle : to.slipTitle}
          </p>
          <p className="font-mono text-xl">{o.orderNumber}</p>
          <p className="text-ink-muted text-sm">{formatDate(o.createdAt)}</p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="mb-1 text-ink-muted text-xs uppercase">{to.shipTo}</p>
          <p className="font-semibold text-base">{o.customerName}</p>
          <p className="font-mono">
            {o.phone}
            {o.altPhone && ` / ${o.altPhone}`}
          </p>
          <p>{o.address}</p>
          <p>
            {o.area}, {o.district}
          </p>
          <p className="text-ink-muted">{o.zone.name}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-ink-muted text-xs uppercase">
            {to.paymentTitle}
          </p>
          <p>{t.paymentMethod[o.paymentMethod]}</p>
          <p className="mt-2 font-semibold text-lg">
            {collect > 0
              ? `${to.codCollect}: ${formatTaka(collect)}`
              : to.prepaid}
          </p>
          {o.courierName && (
            <p className="mt-2">
              {o.courierName}
              {o.trackingNumber && (
                <span className="font-mono"> · {o.trackingNumber}</span>
              )}
            </p>
          )}
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-ink border-b text-left">
            <th className="py-2 font-semibold">{to.itemsTitle}</th>
            <th className="py-2 font-semibold">{to.sku}</th>
            <th className="py-2 text-right font-semibold">{to.qty}</th>
            {invoice && (
              <>
                <th className="py-2 text-right font-semibold">
                  {to.unitPrice}
                </th>
                <th className="py-2 text-right font-semibold">
                  {to.lineTotal}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-ink-muted/40 border-b">
              <td className="py-2">
                {i.productName}
                <span className="block text-ink-muted text-xs">
                  {i.colorName} / {i.sizeName}
                </span>
              </td>
              <td className="py-2 font-mono text-xs">{i.sku}</td>
              <td className="py-2 text-right font-mono">{i.quantity}</td>
              {invoice && (
                <>
                  <td className="py-2 text-right font-mono">
                    {formatTaka(i.unitPrice)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatTaka(i.lineTotal)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {invoice && (
        <dl className="mt-4 ml-auto flex w-64 flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt>{to.subtotal}</dt>
            <dd className="font-mono">{formatTaka(o.subtotal)}</dd>
          </div>
          {o.discount > 0 && (
            <div className="flex justify-between">
              <dt>{to.discount}</dt>
              <dd className="font-mono">−{formatTaka(o.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{to.delivery}</dt>
            <dd className="font-mono">{formatTaka(o.deliveryCharge)}</dd>
          </div>
          <div className="flex justify-between border-ink border-t pt-1 font-semibold text-base">
            <dt>{to.total}</dt>
            <dd className="font-mono">{formatTaka(o.total)}</dd>
          </div>
        </dl>
      )}
      {o.note && (
        <p className="mt-6 border-ink-muted/40 border-t pt-2 text-sm">
          <span className="text-ink-muted">{to.customerNote}: </span>
          {o.note}
        </p>
      )}
    </article>
  );
}
