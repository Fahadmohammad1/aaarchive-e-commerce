"use client";

import { formatTaka } from "@aaarchive/shared/money";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { SalesReport } from "@/lib/report/report-schemas";
import { formatDay, formatTakaCompact } from "./analytics-format";

const METRICS = ["grossSales", "revenue", "orders"] as const;
type Metric = (typeof METRICS)[number];

const isMoney = (metric: Metric) => metric !== "orders";

/**
 * One measure per day as single-series columns (one y-axis; the tabs switch
 * the measure instead of stacking two scales). Colour is the `--primary`
 * token; the chart config carries labels only, so shadcn's ChartStyle never
 * injects a <style> tag (rules.md §8.4).
 */
export function DailyChart({ daily }: { daily: SalesReport["daily"] }) {
  const t = getAdminMessages().analytics;
  const [metric, setMetric] = React.useState<Metric>("grossSales");
  const config = {
    [metric]: { label: t.metrics[metric] },
  } satisfies ChartConfig;
  const formatValue = (value: number) =>
    isMoney(metric) ? formatTaka(value) : String(value);

  return (
    <section className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">
          {t.chartTitle} · {t.metrics[metric]}
        </h2>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            {METRICS.map((m) => (
              <TabsTrigger key={m} value={m} className="min-h-9 px-3">
                {t.metrics[m]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <BarChart data={daily} margin={{ top: 8, right: 4, left: 0 }}>
          <CartesianGrid vertical={false} className="stroke-border" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(d: string) => formatDay(d)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
            tickFormatter={(v: number) =>
              isMoney(metric) ? formatTakaCompact(v) : String(v)
            }
          />
          <ChartTooltip
            cursor={{ className: "fill-accent" }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const day = payload?.[0]?.payload?.date as string | undefined;
                  return day ? formatDay(day, true) : "";
                }}
                formatter={(value) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {t.metrics[metric]}
                    </span>
                    <span className="font-mono">
                      {formatValue(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey={metric}
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="min-h-10 cursor-pointer content-center text-muted-foreground hover:text-foreground">
          {t.showTable}
        </summary>
        <div className="mt-2 max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                {METRICS.map((m) => (
                  <TableHead key={m} className="text-right">
                    {t.metrics[m]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{formatDay(d.date, true)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatTaka(d.grossSales)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatTaka(d.revenue)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {d.orders}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </section>
  );
}
