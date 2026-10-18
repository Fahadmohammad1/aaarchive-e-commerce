"use client";

import type { MediaAsset } from "@aaarchive/shared/media";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/api-error";
import type { ImageRef } from "@/lib/category/category-schemas";
import {
  type CollectionFormInput,
  type CollectionFormValues,
  collectionFormSchema,
} from "@/lib/collection/collection-schemas";
import { errorText } from "@/lib/i18n/error-text";
import { getMessages } from "@/lib/i18n/i18n";
import { FormField } from "./form-field";
import { ImagePicker } from "./image-picker";
import { SwitchField } from "./switch-field";

/** What the dialog edits: a category, or a collection (which adds isActive). */
export type CatalogGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ImageRef | null;
  sortOrder: number;
  showOnHome: boolean;
  isActive?: boolean;
};

type CatalogGroupFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create. */
  item: CatalogGroup | null;
  title: string;
  /** Collections can be hidden from the store; categories cannot. */
  withActive: boolean;
  onSave: (values: CollectionFormValues) => Promise<unknown>;
};

const EMPTY: CollectionFormInput = {
  name: "",
  slug: "",
  description: "",
  image: null,
  sortOrder: 0,
  showOnHome: false,
  isActive: true,
};

/** Create/edit form for categories and collections (PRD §6.3). */
export function CatalogGroupFormDialog({
  open,
  onOpenChange,
  item,
  title,
  withActive,
  onSave,
}: CatalogGroupFormDialogProps) {
  const t = getMessages().admin;
  const [preview, setPreview] = React.useState<MediaAsset | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<CollectionFormInput, unknown, CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;

  // Load the item each time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPreview(item?.image?.media ?? null);
    form.reset(
      item
        ? {
            name: item.name,
            slug: item.slug,
            description: item.description ?? "",
            image: item.image
              ? { mediaId: item.image.mediaId, alt: item.image.alt }
              : null,
            sortOrder: item.sortOrder,
            showOnHome: item.showOnHome,
            isActive: item.isActive ?? true,
          }
        : EMPTY,
    );
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSave(values);
      onOpenChange(false);
    } catch (error) {
      if (ApiError.isApiError(error) && error.code === "SLUG_TAKEN") {
        form.setError("slug", { message: "SLUG_TAKEN" });
      } else {
        setFormError(errorText(error));
      }
    }
  });

  const name = form.watch("name");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="group-name"
            label={t.catalog.name}
            error={errors.name?.message}
          >
            <Input
              id="group-name"
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </FormField>

          <FormField
            id="group-slug"
            label={t.catalog.slug}
            hint={t.catalog.slugHint}
            error={errors.slug?.message}
          >
            <Input
              id="group-slug"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={
                errors.slug ? "group-slug-error" : "group-slug-hint"
              }
              {...form.register("slug")}
            />
          </FormField>

          <FormField
            id="group-description"
            label={`${t.catalog.description} (${t.common.optional})`}
            error={errors.description?.message}
          >
            <Textarea
              id="group-description"
              rows={3}
              maxLength={500}
              aria-invalid={Boolean(errors.description)}
              {...form.register("description")}
            />
          </FormField>

          <Controller
            control={form.control}
            name="image"
            render={({ field, fieldState }) => (
              <ImagePicker
                id="group-image"
                label={`${t.catalog.image} (${t.common.optional})`}
                purpose="content"
                value={field.value ?? null}
                preview={preview}
                defaultAlt={name}
                altError={
                  // Nested error for image.alt.
                  (
                    fieldState.error as
                      | { alt?: { message?: string } }
                      | undefined
                  )?.alt?.message ?? fieldState.error?.message
                }
                onChange={(value, asset) => {
                  field.onChange(value);
                  setPreview(asset);
                }}
              />
            )}
          />

          <FormField
            id="group-sort"
            label={t.catalog.sortOrder}
            hint={t.catalog.sortOrderHint}
            error={errors.sortOrder?.message}
          >
            <Input
              id="group-sort"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              className="w-28 font-mono"
              aria-invalid={Boolean(errors.sortOrder)}
              {...form.register("sortOrder", { valueAsNumber: true })}
            />
          </FormField>

          <div className="flex flex-col divide-y rounded-md border px-3">
            <Controller
              control={form.control}
              name="showOnHome"
              render={({ field }) => (
                <SwitchField
                  id="group-home"
                  label={t.catalog.showOnHome}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            {withActive && (
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <SwitchField
                    id="group-active"
                    label={t.catalog.active}
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            )}
          </div>

          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting
                ? t.saving
                : item
                  ? t.common.saveChanges
                  : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
