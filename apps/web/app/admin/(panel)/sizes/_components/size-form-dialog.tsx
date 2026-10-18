"use client";

import { type SizeInput, sizeInputSchema } from "@aaarchive/shared/catalog";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/api-error";
import { errorText } from "@/lib/i18n/error-text";
import { getMessages } from "@/lib/i18n/i18n";
import type { AdminSize } from "@/lib/size/size-schemas";
import { useSaveSize } from "@/lib/size/use-sizes";

type Values = z.output<typeof sizeInputSchema>;

export function SizeFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AdminSize | null;
}) {
  const t = getMessages().admin;
  const save = useSaveSize();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<SizeInput, unknown, Values>({
    resolver: zodResolver(sizeInputSchema),
    defaultValues: { name: "", sortOrder: 0 },
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(
      item
        ? { name: item.name, sortOrder: item.sortOrder }
        : { name: "", sortOrder: 0 },
    );
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (body) => {
    setFormError(null);
    try {
      await save.mutateAsync({ id: item?.id, body });
      onOpenChange(false);
    } catch (error) {
      if (ApiError.isApiError(error) && error.code === "NAME_TAKEN") {
        form.setError("name", { message: "NAME_TAKEN" });
      } else {
        setFormError(errorText(error));
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {item ? t.catalog.editSize : t.catalog.newSize}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="size-name"
            label={t.catalog.name}
            error={errors.name?.message}
          >
            <Input
              id="size-name"
              autoComplete="off"
              maxLength={12}
              className="font-mono"
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            id="size-sort"
            label={t.catalog.sortOrder}
            hint={t.catalog.sortOrderHint}
            error={errors.sortOrder?.message}
          >
            <Input
              id="size-sort"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              className="w-28 font-mono"
              aria-invalid={Boolean(errors.sortOrder)}
              {...form.register("sortOrder", { valueAsNumber: true })}
            />
          </FormField>
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
