"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminSizeChart } from "@/lib/size-chart/size-chart-schemas";
import {
  useDeleteSizeChart,
  useSizeCharts,
} from "@/lib/size-chart/use-size-charts";
import { SizeChartFormDialog } from "./size-chart-form-dialog";

export function SizeChartsScreen() {
  const t = getAdminMessages();
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const charts = useSizeCharts();
  const remove = useDeleteSizeChart();
  const [editing, setEditing] = React.useState<AdminSizeChart | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminSizeChart | null>(null);

  const openForm = (item: AdminSizeChart | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.sizeCharts}
        description={canEdit ? t.catalog.sizeChartsIntro : t.common.readOnly}
        actions={
          canEdit && (
            <Button size="lg" onClick={() => openForm(null)}>
              <Plus />
              {t.catalog.newSizeChart}
            </Button>
          )
        }
      />

      {charts.isPending ? (
        <ListSkeleton />
      ) : charts.isError ? (
        <ListError error={charts.error} onRetry={() => charts.refetch()} />
      ) : charts.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.catalog.name}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t.catalog.sizesColumn}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {t.catalog.measurementsColumn}
              </TableHead>
              <TableHead className="text-right">{t.catalog.products}</TableHead>
              {canEdit && (
                <TableHead className="text-right">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {charts.data.data.map((chart) => (
              <TableRow key={chart.id} className="h-11">
                <TableCell className="font-medium">{chart.name}</TableCell>
                <TableCell className="hidden font-mono sm:table-cell">
                  {chart.rows.map((row) => row[0]).join(" · ")}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {chart.columns.slice(1).join(", ")}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {chart.productCount}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.edit} ${chart.name}`}
                        onClick={() => openForm(chart)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.delete} ${chart.name}`}
                        onClick={() => setDeleting(chart)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canEdit && (
        <>
          <SizeChartFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            item={editing}
          />
          <ConfirmDeleteDialog
            name={deleting?.name ?? null}
            onCancel={() => setDeleting(null)}
            onConfirm={() => remove.mutateAsync(deleting?.id ?? "")}
          />
        </>
      )}
    </>
  );
}
