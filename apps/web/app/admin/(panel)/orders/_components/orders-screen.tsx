"use client";

import { formatTaka } from "@aaarchive/shared/money";
import {
  type AdminOrderListQuery,
  BULK_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@aaarchive/shared/order";
import { Printer, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useZones } from "@/lib/delivery-zone/use-delivery-zones";
import { errorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { exportOrderItems, exportOrders } from "@/lib/order/order-api";
import type { AdminOrderListItem } from "@/lib/order/order-schemas";
import { useBulkOrderStatus, useOrders } from "@/lib/order/use-admin-orders";
import { formatDateTime } from "./format";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-badges";

const PAGE_SIZE = 20;

function oneOf<T extends string>(values: readonly T[], value: string | null) {
  return values.includes(value as T) ? (value as T) : undefined;
}

/** The list query lives in the URL, so filters survive reloads and links. */
function useListQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query: AdminOrderListQuery = {
    q: params.get("q") ?? undefined,
    status: oneOf(ORDER_STATUSES, params.get("status")),
    paymentStatus: oneOf(PAYMENT_STATUSES, params.get("payment")),
    method: oneOf(PAYMENT_METHODS, params.get("method")),
    zoneId: params.get("zone") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: PAGE_SIZE,
  };
  const set = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return {
    query,
    set,
    clear: () => router.replace(pathname, { scroll: false }),
  };
}

export function OrdersScreen() {
  const t = getAdminMessages();
  const to = t.orders;
  const { query, set, clear } = useListQuery();
  const orders = useOrders(query);
  const zones = useZones();
  const bulk = useBulkOrderStatus();
  const [search, setSearch] = React.useState(query.q ?? "");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [bulkTo, setBulkTo] = React.useState<
    (typeof BULK_STATUSES)[number] | ""
  >("");
  const [bulkMessage, setBulkMessage] = React.useState<string | null>(null);

  React.useEffect(() => setSearch(query.q ?? ""), [query.q]);
  // A new page or filter starts a new selection.
  const listKey = JSON.stringify(query);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on query change
  React.useEffect(() => setSelected([]), [listKey]);

  const rows = orders.data?.data ?? [];
  const total = orders.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(
    query.q ||
      query.status ||
      query.paymentStatus ||
      query.method ||
      query.zoneId ||
      query.from ||
      query.to,
  );
  const { page: _page, limit: _limit, ...filters } = query;
  const allSelected =
    rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  const runBulk = async () => {
    if (!bulkTo || selected.length === 0) return;
    setBulkMessage(null);
    try {
      const { results } = await bulk.mutateAsync({ ids: selected, to: bulkTo });
      const ok = results.filter((r) => r.ok).length;
      setBulkMessage(format(to.bulkDone, { ok, failed: results.length - ok }));
      setSelected([]);
      setBulkTo("");
    } catch (error) {
      setBulkMessage(errorText(error));
    }
  };

  const printHref = (kind: "slip" | "invoice") =>
    `/admin/orders/print?kind=${kind}&ids=${selected.join(",")}`;

  return (
    <>
      <PageHeader
        title={t.nav.orders}
        description={to.intro}
        actions={
          <>
            <ExportMenu
              label={to.exportOrders}
              onExport={(f) => exportOrders(filters, f)}
            />
            <ExportMenu
              label={to.exportItems}
              onExport={(f) => exportOrderItems(filters, f)}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <search className="relative lg:w-72">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                set({ q: search.trim() || undefined });
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
                placeholder={to.search}
                aria-label={to.search}
                className="h-11 pl-8"
              />
            </form>
          </search>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <NativeSelect
              aria-label={to.allStatuses}
              className="sm:w-40"
              value={query.status ?? ""}
              onChange={(e) => set({ status: e.target.value || undefined })}
            >
              <option value="">{to.allStatuses}</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.orderStatus[s]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={to.allPayments}
              className="sm:w-48"
              value={query.paymentStatus ?? ""}
              onChange={(e) => set({ payment: e.target.value || undefined })}
            >
              <option value="">{to.allPayments}</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.paymentStatus[s]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={to.allMethods}
              className="sm:w-40"
              value={query.method ?? ""}
              onChange={(e) => set({ method: e.target.value || undefined })}
            >
              <option value="">{to.allMethods}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t.paymentMethod[m]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={to.allZones}
              className="sm:w-40"
              value={query.zoneId ?? ""}
              onChange={(e) => set({ zone: e.target.value || undefined })}
            >
              <option value="">{to.allZones}</option>
              {zones.data?.data.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {(["from", "to"] as const).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={`orders-${key}`}
                className="text-muted-foreground text-xs"
              >
                {to[key]}
              </label>
              <Input
                id={`orders-${key}`}
                type="date"
                value={query[key] ?? ""}
                onChange={(e) => set({ [key]: e.target.value || undefined })}
                className="h-9 w-40 font-mono"
              />
            </div>
          ))}
          {filtered && (
            <Button variant="ghost" size="lg" onClick={clear}>
              {to.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="sticky top-14 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
          <span className="px-1 text-sm">
            {format(to.selected, { count: selected.length })}
          </span>
          <NativeSelect
            aria-label={to.bulkStatus}
            className="w-44"
            value={bulkTo}
            onChange={(e) => setBulkTo(e.target.value as typeof bulkTo)}
          >
            <option value="">{to.bulkStatus}</option>
            {BULK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.orderStatus[s]}
              </option>
            ))}
          </NativeSelect>
          <Button
            size="lg"
            disabled={!bulkTo || bulk.isPending}
            onClick={runBulk}
          >
            {to.bulkApply}
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={printHref("slip")}>
              <Printer />
              {to.printSlips}
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={printHref("invoice")}>
              <Printer />
              {to.printInvoices}
            </Link>
          </Button>
        </div>
      )}
      {bulkMessage && (
        <p role="status" className="mb-3 text-sm">
          {bulkMessage}
        </p>
      )}

      {orders.isPending ? (
        <ListSkeleton rows={8} />
      ) : orders.isError ? (
        <ListError error={orders.error} onRetry={() => orders.refetch()} />
      ) : rows.length === 0 ? (
        <ListEmpty />
      ) : (
        <>
          {/* Phones: one card per order with a big tap target (Phase 5). */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((o) => (
              <li key={o.id} className="flex gap-3 rounded-md border p-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  aria-label={format(to.selectOrder, { number: o.orderNumber })}
                  checked={selected.includes(o.id)}
                  onChange={(e) => toggle(o.id, e.target.checked)}
                />
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-1"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium font-mono">
                      {o.orderNumber}
                    </span>
                    <span className="font-mono">{formatTaka(o.total)}</span>
                  </span>
                  <span className="truncate text-sm">
                    {o.customerName} ·{" "}
                    <span className="font-mono">{o.phone}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(o.createdAt)} · {o.zoneName} ·{" "}
                    {t.paymentMethod[o.paymentMethod]}
                  </span>
                  <span className="flex flex-wrap gap-1 pt-1">
                    <OrderStatusBadge status={o.status} />
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    aria-label={to.selectAll}
                    checked={allSelected}
                    onChange={(e) =>
                      setSelected(e.target.checked ? rows.map((r) => r.id) : [])
                    }
                  />
                </TableHead>
                <TableHead>{to.order}</TableHead>
                <TableHead>{to.date}</TableHead>
                <TableHead>{to.customer}</TableHead>
                <TableHead>{to.status}</TableHead>
                <TableHead>{to.payment}</TableHead>
                <TableHead className="text-right">{to.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  checked={selected.includes(o.id)}
                  onCheck={(on) => toggle(o.id, on)}
                />
              ))}
            </TableBody>
          </Table>
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="lg"
                disabled={(query.page ?? 1) <= 1}
                onClick={() => set({ page: String((query.page ?? 1) - 1) })}
              >
                {to.previous}
              </Button>
              <span className="text-muted-foreground text-sm">
                {format(to.page, { page: query.page ?? 1, pages })}
              </span>
              <Button
                variant="outline"
                size="lg"
                disabled={(query.page ?? 1) >= pages}
                onClick={() => set({ page: String((query.page ?? 1) + 1) })}
              >
                {to.next}
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function OrderRow({
  order: o,
  checked,
  onCheck,
}: {
  order: AdminOrderListItem;
  checked: boolean;
  onCheck: (on: boolean) => void;
}) {
  const t = getAdminMessages();
  return (
    <TableRow className="h-12">
      <TableCell>
        <input
          type="checkbox"
          className="size-4 accent-primary"
          aria-label={format(t.orders.selectOrder, { number: o.orderNumber })}
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
        />
      </TableCell>
      <TableCell>
        <Link
          href={`/admin/orders/${o.id}`}
          className="font-medium font-mono hover:text-primary"
        >
          {o.orderNumber}
        </Link>
      </TableCell>
      <TableCell className="text-sm">{formatDateTime(o.createdAt)}</TableCell>
      <TableCell>
        <span className="block text-sm">{o.customerName}</span>
        <span className="block font-mono text-muted-foreground text-xs">
          {o.phone} · {o.zoneName}
        </span>
      </TableCell>
      <TableCell>
        <OrderStatusBadge status={o.status} />
      </TableCell>
      <TableCell>
        <span className="flex flex-col items-start gap-1">
          <PaymentStatusBadge status={o.paymentStatus} />
          <span className="text-muted-foreground text-xs">
            {t.paymentMethod[o.paymentMethod]}
          </span>
        </span>
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatTaka(o.total)}
      </TableCell>
    </TableRow>
  );
}
