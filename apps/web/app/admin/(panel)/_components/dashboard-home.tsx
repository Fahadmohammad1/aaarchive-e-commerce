"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useTotpStatus } from "@/lib/auth/use-totp";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { ReportSummary } from "@/lib/report/report-schemas";
import { useReportSummary } from "@/lib/report/use-report-summary";

const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

function Card({
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

function Period({
  label,
  data,
}: {
  label: string;
  data: ReportSummary["today"];
}) {
  const t = getAdminMessages().home;
  return (
    <Card title={label}>
      <dl className="grid grid-cols-3 gap-2">
        <div>
          <dt className="text-muted-foreground text-xs">{t.orders}</dt>
          <dd className="font-mono font-semibold text-2xl">{data.orders}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t.revenue}</dt>
          <dd className="font-mono font-semibold text-lg">
            {formatTaka(data.revenue)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t.pending}</dt>
          <dd className="font-mono text-lg text-muted-foreground">
            {formatTaka(data.pending)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** Dashboard home (PRD §6.1): today, this month, what needs attention. */
export function DashboardHome() {
  const t = getAdminMessages();
  const th = t.home;
  const { user } = useAuth();
  const summary = useReportSummary();
  const totp = useTotpStatus();
  const nudge2fa = user?.role === "OWNER" && totp.data && !totp.data.enabled;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl">
          {format(t.welcome, { name: user?.name ?? "" })}
        </h1>
        {summary.data && (
          <p className="text-muted-foreground text-xs">
            {format(th.updated, {
              time: time.format(new Date(summary.data.generatedAt)),
            })}{" "}
            · {th.revenueHint}
          </p>
        )}
      </div>
      {nudge2fa && (
        <Link
          href="/admin/account"
          className="rounded-md border border-primary/60 p-3 text-sm hover:border-primary"
        >
          {t.twoFactor.ownerNudge}
        </Link>
      )}
      {summary.isPending ? (
        <ListSkeleton rows={6} />
      ) : summary.isError ? (
        <ListError error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Period label={th.today} data={summary.data.today} />
            <Period label={th.month} data={summary.data.month} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={th.awaiting}>
              {summary.data.paymentsAwaiting > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-3xl text-primary">
                    {summary.data.paymentsAwaiting}
                  </span>
                  <Button size="lg" asChild>
                    <Link href="/admin/payments">
                      {th.review}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {th.awaitingNone}
                </p>
              )}
            </Card>
            <Card title={th.byStatus}>
              <ul className="grid grid-cols-2 gap-1">
                {summary.data.byStatus.map((s) => (
                  <li key={s.status}>
                    <Link
                      href={`/admin/orders?status=${s.status}`}
                      className="flex min-h-10 items-center justify-between rounded px-2 text-sm hover:bg-accent"
                    >
                      {t.orderStatus[s.status]}
                      <span className="font-mono">{s.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={th.best}>
              {summary.data.bestSellers.length === 0 ? (
                <p className="text-muted-foreground text-sm">{th.bestNone}</p>
              ) : (
                <ol className="flex flex-col gap-1 text-sm">
                  {summary.data.bestSellers.map((b) => (
                    <li
                      key={b.productId ?? b.productName}
                      className="flex justify-between gap-2"
                    >
                      {b.productId ? (
                        <Link
                          href={`/admin/products/${b.productId}`}
                          className="truncate hover:text-primary"
                        >
                          {b.productName}
                        </Link>
                      ) : (
                        <span className="truncate">{b.productName}</span>
                      )}
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {format(th.sold, { count: b.quantity })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
          <Card title={th.lowStock}>
            <p className="text-muted-foreground text-xs">
              {format(th.lowStockHint, {
                threshold: summary.data.lowStockThreshold,
              })}
            </p>
            {summary.data.lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm">{th.lowStockNone}</p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {summary.data.lowStock.map((v) => (
                  <li key={v.variantId}>
                    <Link
                      href={`/admin/products/${v.productId}?tab=variants`}
                      className="flex min-h-11 items-center justify-between gap-2 rounded px-2 text-sm hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{v.productName}</span>
                        <span className="block text-muted-foreground text-xs">
                          {v.colorName} / {v.sizeName} ·{" "}
                          <span className="font-mono">{v.sku}</span>
                        </span>
                      </span>
                      <span
                        className={
                          v.stock <= 0
                            ? "shrink-0 font-mono text-destructive"
                            : "shrink-0 font-mono text-primary"
                        }
                      >
                        {format(th.left, { count: v.stock })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
