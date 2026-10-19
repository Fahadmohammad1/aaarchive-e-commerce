"use client";

import { formatTaka } from "@aaarchive/shared/money";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminZone } from "@/lib/delivery-zone/delivery-zone-schemas";
import {
  useDeleteZone,
  useZones,
} from "@/lib/delivery-zone/use-delivery-zones";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { ZoneFormDialog } from "./zone-form-dialog";

export function ZonesScreen() {
  const t = getAdminMessages();
  const tz = t.zones;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const zones = useZones();
  const remove = useDeleteZone();
  const [editing, setEditing] = React.useState<AdminZone | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminZone | null>(null);

  const openForm = (item: AdminZone | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.zones}
        description={canEdit ? tz.intro : t.common.readOnly}
        actions={
          canEdit && (
            <Button size="lg" onClick={() => openForm(null)}>
              <Plus />
              {tz.newZone}
            </Button>
          )
        }
      />

      {zones.isPending ? (
        <ListSkeleton />
      ) : zones.isError ? (
        <ListError error={zones.error} onRetry={() => zones.refetch()} />
      ) : zones.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <Table className="max-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>{tz.name}</TableHead>
              <TableHead className="text-right">{tz.charge}</TableHead>
              <TableHead>{tz.estimate}</TableHead>
              <TableHead className="text-right">{tz.orders}</TableHead>
              {canEdit && (
                <TableHead className="text-right">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.data.data.map((zone) => (
              <TableRow key={zone.id} className="h-11">
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {zone.name}
                    {!zone.isActive && (
                      <Badge variant="outline">{tz.off}</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatTaka(zone.charge)}
                </TableCell>
                <TableCell>{zone.estimatedDays}</TableCell>
                <TableCell className="text-right font-mono">
                  {zone.orderCount}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.edit} ${zone.name}`}
                        onClick={() => openForm(zone)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.delete} ${zone.name}`}
                        onClick={() => setDeleting(zone)}
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
          <ZoneFormDialog
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
