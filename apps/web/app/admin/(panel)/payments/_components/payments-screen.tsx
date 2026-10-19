"use client";

import { formatTaka } from "@aaarchive/shared/money";
import {
  PAYMENT_RECORD_STATUSES,
  type PaymentListQuery,
} from "@aaarchive/shared/order";
import { Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ExportMenu } from "@/components/admin/export-menu";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { NativeSelect } from "@/components/admin/native-select";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { exportPayments } from "@/lib/payment/payment-api";
import { usePayments } from "@/lib/payment/use-payments";
import { formatDateTime } from "../../orders/_components/format";
import { PaymentRecordCard } from "../../orders/_components/payment-panel";

const PAGE_SIZE = 20;

/** bKash/Nagad payments to check (PRD §6.4). Pending first by default. */
export function PaymentsScreen() {
  const t = getAdminMessages();
  const tp = t.payments;
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<PaymentListQuery>({
    status: "PENDING",
    page: 1,
    limit: PAGE_SIZE,
  });
  const payments = usePayments(query);
  const total = payments.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const update = (changes: Partial<PaymentListQuery>) =>
    setQuery((q) => ({ ...q, page: 1, ...changes }));
  const { page: _page, limit: _limit, ...filters } = query;

  return (
    <>
      <PageHeader
        title={t.nav.payments}
        description={tp.intro}
        actions={<ExportMenu onExport={(f) => exportPayments(filters, f)} />}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <search className="relative sm:w-64">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: search.trim() || undefined });
            }}
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tp.search}
              aria-label={tp.search}
              className="h-11 pl-8"
            />
          </form>
        </search>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <NativeSelect
            aria-label={tp.allStatuses}
            className="sm:w-40"
            value={query.status ?? ""}
            onChange={(e) =>
              update({
                status: (e.target.value ||
                  undefined) as PaymentListQuery["status"],
              })
            }
          >
            <option value="">{tp.allStatuses}</option>
            {PAYMENT_RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.paymentRecord[s]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={tp.allMethods}
            className="sm:w-40"
            value={query.method ?? ""}
            onChange={(e) =>
              update({
                method: (e.target.value ||
                  undefined) as PaymentListQuery["method"],
              })
            }
          >
            <option value="">{tp.allMethods}</option>
            <option value="BKASH">{t.paymentMethod.BKASH}</option>
            <option value="NAGAD">{t.paymentMethod.NAGAD}</option>
          </NativeSelect>
        </div>
      </div>

      {payments.isPending ? (
        <ListSkeleton rows={6} />
      ) : payments.isError ? (
        <ListError error={payments.error} onRetry={() => payments.refetch()} />
      ) : payments.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {payments.data.data.map((p) => (
            <li key={p.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <Link
                  href={`/admin/orders/${p.order.id}`}
                  className="font-medium font-mono hover:text-primary"
                >
                  {p.order.orderNumber}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {p.order.customerName} ·{" "}
                  <span className="font-mono">{p.order.phone}</span> · {tp.sent}{" "}
                  {formatDateTime(p.createdAt)} · {t.orders.total}{" "}
                  {formatTaka(p.order.total)}
                </span>
              </div>
              <PaymentRecordCard payment={p} isAdvance={p.isAdvance} />
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="lg"
            disabled={(query.page ?? 1) <= 1}
            onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
          >
            {t.orders.previous}
          </Button>
          <span className="text-muted-foreground text-sm">
            {format(t.orders.page, { page: query.page ?? 1, pages })}
          </span>
          <Button
            variant="outline"
            size="lg"
            disabled={(query.page ?? 1) >= pages}
            onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
          >
            {t.orders.next}
          </Button>
        </nav>
      )}
    </>
  );
}
