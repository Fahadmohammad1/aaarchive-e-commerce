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
import type { AdminCategory } from "@/lib/category/category-schemas";
import {
  useCategories,
  useDeleteCategory,
  useSaveCategory,
} from "@/lib/category/use-categories";
import { getMessages } from "@/lib/i18n/i18n";

export function CategoriesScreen() {
  const t = getMessages().admin;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const categories = useCategories();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = React.useState<AdminCategory | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminCategory | null>(null);

  const openForm = (item: AdminCategory | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.nav.categories}
        description={canEdit ? t.catalog.categoriesIntro : t.common.readOnly}
        actions={
          canEdit && (
            <Button size="lg" onClick={() => openForm(null)}>
              <Plus />
              {t.catalog.newCategory}
            </Button>
          )
        }
      />

      {categories.isPending ? (
        <ListSkeleton />
      ) : categories.isError ? (
        <ListError
          error={categories.error}
          onRetry={() => categories.refetch()}
        />
      ) : categories.data.data.length === 0 ? (
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
            {categories.data.data.map((category) => (
              <TableRow key={category.id} className="h-14">
                <TableCell>
                  <GroupThumb image={category.image} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{category.name}</span>
                    <span className="font-mono text-muted-foreground text-xs">
                      /category/{category.slug}
                    </span>
                    {category.showOnHome && (
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
                  {category.productCount}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {category.showOnHome ? (
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
                  {category.sortOrder}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.edit} ${category.name}`}
                        onClick={() => openForm(category)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${t.common.delete} ${category.name}`}
                        onClick={() => setDeleting(category)}
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
            title={editing ? t.catalog.editCategory : t.catalog.newCategory}
            withActive={false}
            onSave={({ isActive: _unused, ...body }) =>
              save.mutateAsync({ id: editing?.id, body })
            }
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
