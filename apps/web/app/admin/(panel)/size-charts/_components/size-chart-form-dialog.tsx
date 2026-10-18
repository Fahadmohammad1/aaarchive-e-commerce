"use client";

import {
  type SizeChartInput,
  type SizeChartValues,
  sizeChartInputSchema,
} from "@aaarchive/shared/catalog";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/admin/form-field";
import {
  blankSizeChartTable,
  SizeChartGrid,
  toSizeChartTable,
} from "@/components/admin/size-chart-grid";
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
import type { AdminSizeChart } from "@/lib/size-chart/size-chart-schemas";
import { useSaveSizeChart } from "@/lib/size-chart/use-size-charts";

function blankChart(): SizeChartInput {
  return { name: "", ...blankSizeChartTable() };
}

export function SizeChartFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AdminSizeChart | null;
}) {
  const t = getMessages().admin;
  const save = useSaveSizeChart();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<SizeChartInput, unknown, SizeChartValues>({
    resolver: zodResolver(sizeChartInputSchema),
    defaultValues: blankChart(),
  });
  const { errors, isSubmitting, isSubmitted } = form.formState;
  const columns = form.watch("columns");
  const rows = form.watch("rows");

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(
      item ? { name: item.name, ...toSizeChartTable(item) } : blankChart(),
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {item ? t.catalog.editSizeChart : t.catalog.newSizeChart}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="chart-name"
            label={t.catalog.sizeChartName}
            hint={t.catalog.sizeChartNameHint}
            error={errors.name?.message}
          >
            <Input
              id="chart-name"
              autoComplete="off"
              maxLength={60}
              className="sm:max-w-sm"
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </FormField>

          <SizeChartGrid
            id="chart-grid"
            value={{ columns, rows }}
            errors={errors}
            onChange={(next) => {
              // Re-validate live once a save was tried.
              const options = {
                shouldDirty: true,
                shouldValidate: isSubmitted,
              };
              form.setValue("columns", next.columns, options);
              form.setValue("rows", next.rows, options);
            }}
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
