"use client";

import {
  type DeliveryZoneInput,
  deliveryZoneInputSchema,
} from "@aaarchive/shared/delivery";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/admin/form-field";
import { SwitchField } from "@/components/admin/switch-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { ApiError } from "@/lib/api/api-error";
import type { AdminZone } from "@/lib/delivery-zone/delivery-zone-schemas";
import { useSaveZone } from "@/lib/delivery-zone/use-delivery-zones";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

type Values = z.output<typeof deliveryZoneInputSchema>;

const EMPTY: DeliveryZoneInput = {
  name: "",
  charge: 0,
  estimatedDays: "",
  sortOrder: 0,
  isActive: true,
};

export function ZoneFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AdminZone | null;
}) {
  const returnFocus = useReturnFocus();
  const t = getAdminMessages();
  const tz = t.zones;
  const save = useSaveZone();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<DeliveryZoneInput, unknown, Values>({
    resolver: zodResolver(deliveryZoneInputSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(
      item
        ? {
            name: item.name,
            charge: item.charge,
            estimatedDays: item.estimatedDays,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : EMPTY,
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
      <DialogContent {...returnFocus} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? tz.editZone : tz.newZone}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="zone-name"
            label={tz.name}
            error={errors.name?.message}
          >
            <Input
              id="zone-name"
              autoComplete="off"
              maxLength={40}
              placeholder={tz.namePlaceholder}
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="zone-charge"
              label={tz.charge}
              hint={tz.chargeHint}
              error={errors.charge?.message}
            >
              <Input
                id="zone-charge"
                type="number"
                inputMode="numeric"
                min={0}
                className="font-mono"
                aria-invalid={Boolean(errors.charge)}
                {...form.register("charge", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              id="zone-days"
              label={tz.estimate}
              hint={tz.estimateHint}
              error={errors.estimatedDays?.message}
            >
              <Input
                id="zone-days"
                autoComplete="off"
                maxLength={30}
                aria-invalid={Boolean(errors.estimatedDays)}
                {...form.register("estimatedDays")}
              />
            </FormField>
          </div>
          <FormField
            id="zone-sort"
            label={t.catalog.sortOrder}
            hint={t.catalog.sortOrderHint}
            error={errors.sortOrder?.message}
          >
            <Input
              id="zone-sort"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              className="w-28 font-mono"
              aria-invalid={Boolean(errors.sortOrder)}
              {...form.register("sortOrder", { valueAsNumber: true })}
            />
          </FormField>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <SwitchField
                id="zone-active"
                label={tz.active}
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
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
