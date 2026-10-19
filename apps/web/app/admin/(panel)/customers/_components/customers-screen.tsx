"use client";

import type { CustomerListQuery } from "@aaarchive/shared/customer";
import { formatTaka } from "@aaarchive/shared/money";
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
import { Badge } from "@/components/ui/badge";
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
import { exportCustomers } from "@/lib/customer/customer-api";
import { useCustomers } from "@/lib/customer/use-customers";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { formatDate } from "../../orders/_components/format";

const PAGE_SIZE = 20;

const rate = (r: number | null) => (r == null ? "—" : `${r}%`);

/** Customers by phone, guests included (PRD §6.5). */
export function CustomersScreen() {
  const t = getAdminMessages();
  const tc = t.customers;
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<CustomerListQuery>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const customers = useCustomers(query);
  const total = customers.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const { page: _page, limit: _limit, ...filters } = query;

  return (
    <>
      <PageHeader
        title={t.nav.customers}
        description={tc.intro}
        actions={<ExportMenu onExport={(f) => exportCustomers(filters, f)} />}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <search className="relative sm:w-64">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery((q) => ({
                ...q,
                page: 1,
                q: search.trim() || undefined,
              }));
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
              placeholder={tc.search}
              aria-label={tc.search}
              className="h-11 pl-8"
            />
          </form>
        </search>
        <NativeSelect
          aria-label={tc.all}
          className="sm:w-44"
          value={query.blocked ?? ""}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              page: 1,
              blocked: (e.target.value ||
                undefined) as CustomerListQuery["blocked"],
            }))
          }
        >
          <option value="">{tc.all}</option>
          <option value="1">{tc.onlyBlocked}</option>
          <option value="0">{tc.notBlocked}</option>
        </NativeSelect>
      </div>

      {customers.isPending ? (
        <ListSkeleton rows={8} />
      ) : customers.isError ? (
        <ListError
          error={customers.error}
          onRetry={() => customers.refetch()}
        />
      ) : customers.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {customers.data.data.map((c) => (
              <li key={c.phone}>
                <Link
                  href={`/admin/customers/${c.phone}`}
                  className="flex flex-col gap-1 rounded-md border p-3"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.blocked && (
                      <Badge variant="stock-out">{tc.blocked}</Badge>
                    )}
                  </span>
                  <span className="font-mono text-sm">{c.phone}</span>
                  <span className="text-muted-foreground text-xs">
                    {tc.orders} {c.orders} · {tc.delivered} {c.delivered} ·{" "}
                    {tc.successRate} {rate(c.successRate)} ·{" "}
                    {formatTaka(c.totalSpent)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>{t.orders.customer}</TableHead>
                <TableHead className="text-right">{tc.orders}</TableHead>
                <TableHead className="text-right">{tc.delivered}</TableHead>
                <TableHead className="text-right">{tc.failed}</TableHead>
                <TableHead className="text-right">{tc.successRate}</TableHead>
                <TableHead className="text-right">{tc.spent}</TableHead>
                <TableHead>{tc.lastOrder}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.data.data.map((c) => (
                <TableRow key={c.phone} className="h-12">
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.phone}`}
                      className="hover:text-primary"
                    >
                      <span className="flex items-center gap-2">
                        {c.name}
                        {c.blocked && (
                          <Badge variant="stock-out">{tc.blocked}</Badge>
                        )}
                      </span>
                      <span className="block font-mono text-muted-foreground text-xs">
                        {c.phone}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {c.orders}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {c.delivered}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {c.cancelledOrReturned}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {rate(c.successRate)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatTaka(c.totalSpent)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(c.lastOrderAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="lg"
                disabled={(query.page ?? 1) <= 1}
                onClick={() =>
                  setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))
                }
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
                onClick={() =>
                  setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))
                }
              >
                {t.orders.next}
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
