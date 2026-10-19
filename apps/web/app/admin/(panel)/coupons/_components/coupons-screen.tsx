"use client";

import type {
  COUPON_STATUSES,
  CouponListQuery,
} from "@aaarchive/shared/coupon";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import * as React from "react";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { ExportMenu } from "@/components/admin/export-menu";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { NativeSelect } from "@/components/admin/native-select";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
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
import { exportCoupons } from "@/lib/coupon/coupon-api";
import type { AdminCoupon } from "@/lib/coupon/coupon-schemas";
import { useCoupons, useDeleteCoupon } from "@/lib/coupon/use-coupons";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { CouponFormDialog } from "./coupon-form-dialog";
import {
  datesLabel,
  discountLabel,
  limitsLabel,
  usageLabel,
} from "./coupon-summary";

type Status = (typeof COUPON_STATUSES)[number];

export function CouponsScreen() {
  const t = getAdminMessages();
  const tc = t.coupons;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState<CouponListQuery>({ limit: 100 });
  const coupons = useCoupons(query);
  const remove = useDeleteCoupon();
  const [editing, setEditing] = React.useState<AdminCoupon | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminCoupon | null>(null);

  const openForm = (item: AdminCoupon | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.coupons}
        description={canEdit ? tc.intro : t.common.readOnly}
        actions={
          // Coupons export is Owner only (PRD §6.9 rule 2).
          canEdit && (
            <>
              <ExportMenu
                onExport={(format) => {
                  const { page: _page, limit: _limit, ...filters } = query;
                  return exportCoupons(filters, format);
                }}
              />
              <Button size="lg" onClick={() => openForm(null)}>
                <Plus />
                {tc.newCoupon}
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <search className="relative sm:w-64">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setQuery((q) => ({ ...q, q: search.trim() || undefined }));
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
              className="h-11 pl-8 font-mono uppercase"
            />
          </form>
        </search>
        <NativeSelect
          aria-label={tc.statusAll}
          className="sm:w-44"
          value={query.status ?? ""}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              status: (e.target.value || undefined) as Status | undefined,
            }))
          }
        >
          <option value="">{tc.statusAll}</option>
          <option value="active">{tc.statusActive}</option>
          <option value="inactive">{tc.statusInactive}</option>
        </NativeSelect>
      </div>

      {coupons.isPending ? (
        <ListSkeleton />
      ) : coupons.isError ? (
        <ListError error={coupons.error} onRetry={() => coupons.refetch()} />
      ) : coupons.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <>
          {/* Phones: one card per coupon (design.md §8). */}
          <ul className="flex flex-col gap-2 md:hidden">
            {coupons.data.data.map((c) => (
              <li key={c.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium font-mono">
                      {c.code}
                      {!c.isActive && (
                        <Badge variant="outline">{tc.statusInactive}</Badge>
                      )}
                    </p>
                    <p className="text-sm">{discountLabel(c, tc)}</p>
                    <p className="text-muted-foreground text-xs">
                      {datesLabel(c, tc)} · {limitsLabel(c, tc)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {tc.used}:{" "}
                      <span className="font-mono">{usageLabel(c)}</span>
                    </p>
                  </div>
                  {canEdit && (
                    <RowActions
                      coupon={c}
                      onEdit={openForm}
                      onDelete={setDeleting}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>{tc.code}</TableHead>
                <TableHead>{tc.value}</TableHead>
                <TableHead>{tc.dates}</TableHead>
                <TableHead>{tc.limits}</TableHead>
                <TableHead className="text-right">{tc.used}</TableHead>
                {canEdit && (
                  <TableHead className="text-right">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.data.data.map((c) => (
                <TableRow key={c.id} className="h-11">
                  <TableCell className="font-medium font-mono">
                    <span className="flex items-center gap-2">
                      {c.code}
                      {!c.isActive && (
                        <Badge variant="outline">{tc.statusInactive}</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{discountLabel(c, tc)}</TableCell>
                  <TableCell className="text-sm">{datesLabel(c, tc)}</TableCell>
                  <TableCell className="text-sm">
                    {limitsLabel(c, tc)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {usageLabel(c)}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <RowActions
                        coupon={c}
                        onEdit={openForm}
                        onDelete={setDeleting}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {canEdit && (
        <>
          <CouponFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            item={editing}
          />
          <ConfirmDeleteDialog
            name={deleting?.code ?? null}
            onCancel={() => setDeleting(null)}
            onConfirm={() => remove.mutateAsync(deleting?.id ?? "")}
          />
        </>
      )}
    </>
  );
}

function RowActions({
  coupon,
  onEdit,
  onDelete,
}: {
  coupon: AdminCoupon;
  onEdit: (c: AdminCoupon) => void;
  onDelete: (c: AdminCoupon) => void;
}) {
  const t = getAdminMessages().common;
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`${t.edit} ${coupon.code}`}
        onClick={() => onEdit(coupon)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`${t.delete} ${coupon.code}`}
        onClick={() => onDelete(coupon)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
