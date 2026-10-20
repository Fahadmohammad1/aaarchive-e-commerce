"use client";

import { formatTaka } from "@aaarchive/shared/money";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { SalesReport } from "@/lib/report/report-schemas";
import { useSalesReport } from "@/lib/report/use-sales-report";
import { formatDay, formatPercent, ratio } from "./analytics-format";
import { rangeFromParams } from "./analytics-range";
import { BarList, Panel } from "./breakdown";
import { DailyChart } from "./daily-chart";
import { KpiGrid } from "./kpi-grid";
import { RangeFilter } from "./range-filter";

const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

/** Sales analytics (owner request 2026-10-20). Owner only; the API refuses everyone else. */
export function SalesAnalyticsScreen() {
  const t = getAdminMessages();
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { preset, query } = rangeFromParams(new URLSearchParams(params));
  const isOwner = user?.role === "OWNER";
  const report = useSalesReport(query, isOwner);

  if (!isOwner) {
    return <p className="text-muted-foreground">{t.errors.FORBIDDEN}</p>;
  }

  const go = (next: Record<string, string>) =>
    router.replace(`${pathname}?${new URLSearchParams(next)}`, {
      scroll: false,
    });

  return (
    <>
      <PageHeader
        title={t.analytics.title}
        description={t.analytics.intro}
        actions={
          <RangeFilter
            preset={preset}
            query={query}
            onPreset={(p) => go({ range: p })}
            onCustom={(r) => go({ range: "custom", ...r })}
          />
        }
      />
      {report.isPending ? (
        <ListSkeleton rows={8} />
      ) : report.isError ? (
        <ListError error={report.error} onRetry={() => report.refetch()} />
      ) : (
        <div
          className="flex flex-col gap-4 transition-opacity aria-busy:opacity-60"
          aria-busy={report.isPlaceholderData}
        >
          <Report data={report.data} />
        </div>
      )}
    </>
  );
}

function Report({ data }: { data: SalesReport }) {
  const t = getAdminMessages();
  const ta = t.analytics;
  const { range } = data;
  // Status/payment/zone rows open the orders list for the same dates.
  const ordersHref = (filter: Record<string, string>) =>
    `/admin/orders?${new URLSearchParams({ ...filter, from: range.from, to: range.to })}`;
  const sales = (value: number, orders: number) =>
    `${formatTaka(value)} · ${format(ta.ordersCount, { count: orders })}`;
  const units = (quantity: number) =>
    format(ta.itemsCount, { count: quantity });

  return (
    <>
      <p className="text-muted-foreground text-xs">
        <span className="font-medium text-foreground">
          {format(ta.period, {
            from: formatDay(range.from, true),
            to: formatDay(range.to, true),
          })}
        </span>{" "}
        ·{" "}
        {format(ta.compared, {
          from: formatDay(range.previousFrom, true),
          to: formatDay(range.previousTo, true),
        })}{" "}
        ·{" "}
        {format(ta.updated, { time: time.format(new Date(data.generatedAt)) })}
      </p>

      <KpiGrid totals={data.totals} previous={data.previous} />
      <DailyChart daily={data.daily} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={ta.topProducts} className="lg:col-span-2">
          {data.topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">{ta.none}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ta.product}</TableHead>
                  <TableHead className="text-right">{ta.units}</TableHead>
                  <TableHead className="text-right">{ta.sales}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.map((p) => (
                  <TableRow key={p.productId ?? p.productName}>
                    <TableCell className="max-w-0 truncate">
                      {p.productId ? (
                        <Link
                          href={`/admin/products/${p.productId}`}
                          className="hover:text-primary"
                        >
                          {p.productName}
                        </Link>
                      ) : (
                        p.productName
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {p.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatTaka(p.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel title={ta.customers}>
          <p className="text-sm">
            {format(ta.customersTotal, { count: data.customers.total })}
          </p>
          <BarList
            items={[
              {
                key: "new",
                label: ta.newCustomers,
                value: data.customers.new,
                valueText: `${data.customers.new} · ${formatPercent(ratio(data.customers.new, data.customers.total))}`,
              },
              {
                key: "returning",
                label: ta.returningCustomers,
                value: data.customers.returning,
                valueText: `${data.customers.returning} · ${formatPercent(ratio(data.customers.returning, data.customers.total))}`,
              },
            ].filter(() => data.customers.total > 0)}
          />
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Panel title={ta.byCategory}>
          <BarList
            items={data.byCategory.map((c) => ({
              key: c.categoryId ?? "none",
              label: c.name ?? ta.unknownCategory,
              value: c.revenue,
              valueText: `${formatTaka(c.revenue)} · ${units(c.quantity)}`,
            }))}
          />
        </Panel>
        <Panel title={ta.byPayment}>
          <BarList
            items={data.byPaymentMethod.map((m) => ({
              key: m.method,
              label: t.paymentMethod[m.method],
              value: m.value,
              valueText: sales(m.value, m.orders),
              href: ordersHref({ method: m.method }),
            }))}
          />
        </Panel>
        <Panel title={ta.byStatus}>
          <BarList
            items={data.byStatus
              .filter((s) => s.orders > 0)
              .map((s) => ({
                key: s.status,
                label: t.orderStatus[s.status],
                value: s.orders,
                valueText: sales(s.value, s.orders),
                href: ordersHref({ status: s.status }),
              }))}
          />
        </Panel>
        <Panel title={ta.byZone}>
          <BarList
            items={data.byZone.map((z) => ({
              key: z.zoneId,
              label: z.name,
              value: z.orders,
              valueText: sales(z.value, z.orders),
              href: ordersHref({ zone: z.zoneId }),
            }))}
          />
        </Panel>
        <Panel title={ta.bySize}>
          <BarList
            items={data.bySize.map((s) => ({
              key: s.name,
              label: s.name,
              value: s.quantity,
              valueText: units(s.quantity),
            }))}
          />
        </Panel>
        <Panel title={ta.byColor}>
          <BarList
            items={data.byColor.map((c) => ({
              key: c.name,
              label: c.name,
              value: c.quantity,
              valueText: units(c.quantity),
            }))}
          />
        </Panel>
      </div>

      <Panel title={ta.coupons}>
        {data.coupons.length === 0 ? (
          <p className="text-muted-foreground text-sm">{ta.none}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ta.coupon}</TableHead>
                <TableHead className="text-right">{t.home.orders}</TableHead>
                <TableHead className="text-right">{ta.discount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.coupons.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell className="text-right font-mono">
                    {c.orders}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatTaka(c.discount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
