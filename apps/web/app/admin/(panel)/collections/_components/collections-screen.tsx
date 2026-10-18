"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { CatalogGroupFormDialog } from "@/components/admin/catalog-group-form-dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { GroupThumb } from "@/components/admin/group-thumb";
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
import type { AdminCollection } from "@/lib/collection/collection-schemas";
import {
  useCollections,
  useDeleteCollection,
  useSaveCollection,
} from "@/lib/collection/use-collections";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

export function CollectionsScreen() {
  const t = getAdminMessages();
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const collections = useCollections();
  const save = useSaveCollection();
  const remove = useDeleteCollection();
  const [editing, setEditing] = React.useState<AdminCollection | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminCollection | null>(null);

  const openForm = (item: AdminCollection | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.collections}
        description={canEdit ? t.catalog.collectionsIntro : t.common.readOnly}
        actions={
          canEdit && (
            <Button size="lg" onClick={() => openForm(null)}>
              <Plus />
              {t.catalog.newCollection}
            </Button>
          )
        }
      />

      {collections.isPending ? (
        <ListSkeleton />
      ) : collections.isError ? (
        <ListError
          error={collections.error}
          onRetry={() => collections.refetch()}
        />
      ) : collections.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">
                <span className="sr-only">{t.catalog.image}</span>
              </TableHead>
              <TableHead>{t.catalog.name}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {t.catalog.products}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {t.catalog.showOnHome}
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
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
            {collections.data.data.map((collection) => (
              <TableRow key={collection.id} className="h-14">
                <TableCell>
                  <GroupThumb image={collection.image} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-medium">
                      {collection.name}
                      {!collection.isActive && (
                        <Badge variant="outline">{t.catalog.hidden}</Badge>
                      )}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      /collection/{collection.slug}
                    </span>
                    {collection.showOnHome && (
                      <Badge
                        variant="outline"
                        className="mt-1 border-primary text-primary sm:hidden"
                      >
                        {t.catalog.onHome}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden text-right font-mono sm:table-cell">
                  {collection.productCount}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {collection.showOnHome ? (
                    <Badge
                      variant="outline"
                      className="border-primary text-primary"
                    >
                      {t.common.yes}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{t.common.no}</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right font-mono sm:table-cell">
                  {collection.sortOrder}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.edit} ${collection.name}`}
                        onClick={() => openForm(collection)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.delete} ${collection.name}`}
                        onClick={() => setDeleting(collection)}
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
          <CatalogGroupFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            item={editing}
            title={editing ? t.catalog.editCollection : t.catalog.newCollection}
            withActive
            onSave={(body) => save.mutateAsync({ id: editing?.id, body })}
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
