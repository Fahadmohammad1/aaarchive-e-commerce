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
import type { AdminColor } from "@/lib/color/color-schemas";
import { useColors, useDeleteColor } from "@/lib/color/use-colors";
import { getMessages } from "@/lib/i18n/i18n";
import { ColorFormDialog } from "./color-form-dialog";

export function ColorsScreen() {
  const t = getMessages().admin;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const colors = useColors();
  const remove = useDeleteColor();
  const [editing, setEditing] = React.useState<AdminColor | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminColor | null>(null);

  const openForm = (item: AdminColor | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.colors}
        description={canEdit ? t.catalog.colorsIntro : t.common.readOnly}
        actions={
          canEdit && (
            <Button color="lg" onClick={() => openForm(null)}>
              <Plus />
              {t.catalog.newColor}
            </Button>
          )
        }
      />

      {colors.isPending ? (
        <ListSkeleton />
      ) : colors.isError ? (
        <ListError error={colors.error} onRetry={() => colors.refetch()} />
      ) : colors.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <Table className="max-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only">{t.catalog.swatch}</span>
              </TableHead>
              <TableHead>{t.catalog.name}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t.catalog.hex}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t.catalog.variants}
              </TableHead>
              <TableHead className="text-right">
                {t.catalog.sortOrder}
              </TableHead>
              {canEdit && (
                <TableHead className="text-right">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {colors.data.data.map((color) => (
              <TableRow key={color.id} className="h-11">
                <TableCell>
                  <span
                    aria-hidden
                    className="block size-6 rounded-full border"
                    style={{ backgroundColor: color.hex }}
                  />
                </TableCell>
                <TableCell className="font-medium">{color.name}</TableCell>
                <TableCell className="hidden font-mono text-muted-foreground sm:table-cell">
                  {color.hex}
                </TableCell>
                <TableCell className="hidden text-right font-mono sm:table-cell">
                  {color.variantCount}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {color.sortOrder}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        color="icon-lg"
                        aria-label={`${t.common.edit} ${color.name}`}
                        onClick={() => openForm(color)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        color="icon-lg"
                        aria-label={`${t.common.delete} ${color.name}`}
                        onClick={() => setDeleting(color)}
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
          <ColorFormDialog
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
