"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { ArrowLeft, Ban, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { Button } from "@/components/ui/button";
import {
  useBlockedPhones,
  useCustomer,
  useUnblockPhone,
} from "@/lib/customer/use-customers";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { formatDate, formatDateTime } from "../../orders/_components/format";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "../../orders/_components/order-badges";
import { BlockDialog } from "./block-dialog";

export function CustomerDetailRoute() {
  const { phone } = useParams<{ phone: string }>();
  return <CustomerDetail phone={decodeURIComponent(phone)} />;
}

function CustomerDetail({ phone }: { phone: string }) {
  const t = getAdminMessages();
  const tc = t.customers;
  const detail = useCustomer(phone);
  const blockedList = useBlockedPhones(phone);
  const unblock = useUnblockPhone();
  const [blocking, setBlocking] = React.useState(false);
  const [unblocking, setUnblocking] = React.useState(false);

  if (detail.isPending) return <ListSkeleton rows={6} />;
  if (detail.isError)
    return <ListError error={detail.error} onRetry={() => detail.refetch()} />;
  const { customer, block, orders } = detail.data;
  const blockId = blockedList.data?.data.find(
    (b) => b.phone === detail.data.phone,
  )?.id;
  const stats = customer
    ? [
        [tc.orders, String(customer.orders)],
        [tc.delivered, String(customer.delivered)],
        [tc.failed, String(customer.cancelledOrReturned)],
        [
          tc.successRate,
          customer.successRate == null ? "—" : `${customer.successRate}%`,
        ],
        [tc.spent, formatTaka(customer.totalSpent)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/customers"
        className="flex min-h-11 w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {tc.back}
      </Link>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-semibold text-2xl">
            {customer?.name ?? detail.data.phone}
          </h1>
          <p className="font-mono">{detail.data.phone}</p>
          {customer && (
            <p className="text-muted-foreground text-sm">
              {format(tc.since, { date: formatDate(customer.firstOrderAt) })}
              {customer.email && ` · ${customer.email}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="lg" asChild>
            <a href={`tel:${detail.data.phone}`}>
              <Phone />
              {t.orders.call}
            </a>
          </Button>
          {block ? (
            <Button
              variant="outline"
              size="lg"
              disabled={!blockId}
              onClick={() => setUnblocking(true)}
            >
              {tc.unblock}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="text-destructive"
              onClick={() => setBlocking(true)}
            >
              <Ban />
              {tc.block}
            </Button>
          )}
        </div>
      </header>

      {block && (
        <p
          role="status"
          className="rounded-md border border-destructive/60 p-3 text-sm"
        >
          {format(tc.blockedBecause, {
            by: block.by ?? "—",
            date: formatDate(block.at),
            reason: block.reason,
          })}
        </p>
      )}

      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="font-mono font-semibold text-lg">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.nav.orders}</h2>
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 hover:border-line-strong"
              >
                <span className="flex flex-col">
                  <span className="font-medium font-mono">{o.orderNumber}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(o.createdAt)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <span className="font-mono">{formatTaka(o.total)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <BlockDialog
        open={blocking}
        onOpenChange={setBlocking}
        phone={detail.data.phone}
      />
      <ConfirmDeleteDialog
        name={unblocking ? detail.data.phone : null}
        title={format(tc.unblockConfirm, { phone: detail.data.phone })}
        description={tc.blockHint}
        confirmLabel={tc.unblock}
        onCancel={() => setUnblocking(false)}
        onConfirm={async () => {
          if (blockId) await unblock.mutateAsync(blockId);
          setUnblocking(false);
        }}
      />
    </div>
  );
}
