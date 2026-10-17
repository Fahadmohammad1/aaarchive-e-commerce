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
import { getMessages } from "@/lib/i18n/i18n";
import type { AdminSize } from "@/lib/size/size-schemas";
import { useDeleteSize, useSizes } from "@/lib/size/use-sizes";
import { SizeFormDialog } from "./size-form-dialog";

export function SizesScreen() {
  const t = getMessages().admin;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const sizes = useSizes();
  const remove = useDeleteSize();
  const [editing, setEditing] = React.useState<AdminSize | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminSize | null>(null);

  const openForm = (item: AdminSize | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.sizes}
        description={canEdit ? t.catalog.sizesIntro : t.common.readOnly}
        actions={
          canEdit && (
            <Button size="lg" onClick={() => openForm(null)}>
              <Plus />
              {t.catalog.newSize}
            </Button>
          )
        }
      />

      {sizes.isPending ? (
        <ListSkeleton />
      ) : sizes.isError ? (
        <ListError error={sizes.error} onRetry={() => sizes.refetch()} />
      ) : sizes.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <Table className="max-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead>{t.catalog.name}</TableHead>
              <TableHead className="text-right">{t.catalog.variants}</TableHead>
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
            {sizes.data.data.map((size) => (
              <TableRow key={size.id} className="h-11">
                <TableCell className="font-medium font-mono">
                  {size.name}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {size.variantCount}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {size.sortOrder}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.edit} ${size.name}`}
                        onClick={() => openForm(size)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.delete} ${size.name}`}
                        onClick={() => setDeleting(size)}
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
          <SizeFormDialog
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
