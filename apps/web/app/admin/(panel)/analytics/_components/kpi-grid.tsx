import { formatTaka } from "@aaarchive/shared/money";
import { cn } from "cn";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { SalesTotals } from "@/lib/report/report-schemas";
import { change, formatPercent, ratio } from "./analytics-format";

type Kpi = {
  label: string;
  value: string;
  hint: string;
  current: number;
  previous: number;
  /** For losses (cancel/return rate), going up is bad. */
  upIsBad?: boolean;
};

function Delta({ current, previous, upIsBad }: Kpi) {
  const t = getAdminMessages().analytics;
  const diff = change(current, previous);
  if (diff === null) {
    return <p className="text-muted-foreground text-xs">{t.changeNew}</p>;
  }
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "same";
  const Icon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Minus;
  const good = direction === "same" ? null : (direction === "up") !== upIsBad;
  const sign = diff > 0 ? "+" : "";
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs",
        good === null
          ? "text-muted-foreground"
          : good
            ? "text-success"
            : "text-destructive",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">{t[direction]}:</span>
      {format(t.change, { change: `${sign}${formatPercent(diff)}` })}
    </p>
  );
}

/** Headline numbers with the change against the previous period. */
export function KpiGrid({
  totals,
  previous,
}: {
  totals: SalesTotals;
  previous: SalesTotals;
}) {
  const t = getAdminMessages().analytics.kpi;
  const aov = (s: SalesTotals) =>
    Math.round(ratio(s.grossSales, s.validOrders));
  const lossRate = (s: SalesTotals) =>
    ratio(s.cancelled + s.returned, s.orders);

  const kpis: Kpi[] = [
    {
      label: t.grossSales,
      value: formatTaka(totals.grossSales),
      hint: t.grossSalesHint,
      current: totals.grossSales,
      previous: previous.grossSales,
    },
    {
      label: t.revenue,
      value: formatTaka(totals.revenue),
      hint: t.revenueHint,
      current: totals.revenue,
      previous: previous.revenue,
    },
    {
      label: t.orders,
      value: String(totals.validOrders),
      hint: format(t.ordersHint, {
        all: totals.orders,
        valid: totals.validOrders,
      }),
      current: totals.validOrders,
      previous: previous.validOrders,
    },
    {
      label: t.aov,
      value: formatTaka(aov(totals)),
      hint: t.aovHint,
      current: aov(totals),
      previous: aov(previous),
    },
    {
      label: t.units,
      value: String(totals.unitsSold),
      hint: t.unitsHint,
      current: totals.unitsSold,
      previous: previous.unitsSold,
    },
    {
      label: t.discount,
      value: formatTaka(totals.discount),
      hint: t.discountHint,
      current: totals.discount,
      previous: previous.discount,
      upIsBad: true,
    },
    {
      label: t.lossRate,
      value: formatPercent(lossRate(totals)),
      hint: format(t.lossRateHint, {
        cancelled: totals.cancelled,
        returned: totals.returned,
      }),
      current: lossRate(totals),
      previous: lossRate(previous),
      upIsBad: true,
    },
    {
      label: t.pending,
      value: formatTaka(totals.pending),
      hint: t.pendingHint,
      current: totals.pending,
      previous: previous.pending,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="flex flex-col gap-1 rounded-md border p-3 sm:p-4"
        >
          <dt className="text-muted-foreground text-xs">{kpi.label}</dt>
          <dd className="flex flex-col gap-1">
            <span className="font-mono font-semibold text-lg sm:text-2xl">
              {kpi.value}
            </span>
            <Delta {...kpi} />
            <span className="text-subtle text-xs">{kpi.hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
