"use client";

import { type ColorInput, colorInputSchema } from "@aaarchive/shared/catalog";
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
import type { AdminColor } from "@/lib/color/color-schemas";
import { useSaveColor } from "@/lib/color/use-colors";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

type Values = z.output<typeof colorInputSchema>;

export function ColorFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AdminColor | null;
}) {
  const t = getAdminMessages();
  const save = useSaveColor();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<ColorInput, unknown, Values>({
    resolver: zodResolver(colorInputSchema),
    defaultValues: { name: "", hex: "#000000", sortOrder: 0 },
  });
  const { errors, isSubmitting } = form.formState;
  const hex = form.watch("hex");

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(
      item
        ? { name: item.name, hex: item.hex, sortOrder: item.sortOrder }
        : { name: "", hex: "#000000", sortOrder: 0 },
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
            {item ? t.catalog.editColor : t.catalog.newColor}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="color-name"
            label={t.catalog.name}
            error={errors.name?.message}
          >
            <Input
              id="color-name"
              autoComplete="off"
              maxLength={30}
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            id="color-hex"
            label={t.catalog.hex}
            hint={t.catalog.hexHint}
            error={errors.hex?.message}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-8 shrink-0 rounded-md border"
                style={{
                  backgroundColor: /^#[0-9a-f]{6}$/i.test(hex ?? "")
                    ? hex
                    : "transparent",
                }}
              />
              <Input
                id="color-hex"
                autoComplete="off"
                spellCheck={false}
                maxLength={7}
                className="w-32 font-mono uppercase"
                aria-invalid={Boolean(errors.hex)}
                {...form.register("hex")}
              />
              <input
                type="color"
                aria-label={t.catalog.swatch}
                value={/^#[0-9a-f]{6}$/i.test(hex ?? "") ? hex : "#000000"}
                onChange={(event) =>
                  form.setValue("hex", event.target.value.toUpperCase(), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className="h-11 w-11 cursor-pointer rounded-md border bg-transparent p-1"
              />
            </div>
          </FormField>
          <FormField
            id="color-sort"
            label={t.catalog.sortOrder}
            hint={t.catalog.sortOrderHint}
            error={errors.sortOrder?.message}
          >
            <Input
              id="color-sort"
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
