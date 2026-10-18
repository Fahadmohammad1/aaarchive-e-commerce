"use client";

import {
  SIZE_CHART_MAX_COLUMNS,
  SIZE_CHART_MAX_ROWS,
  SIZE_CHART_MIN_COLUMNS,
  type SizeChartInput,
  type SizeChartValues,
  sizeChartInputSchema,
} from "@aaarchive/shared/catalog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
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
import { errorText, fieldErrorText } from "@/lib/i18n/error-text";
import { format, getMessages } from "@/lib/i18n/i18n";
import type { AdminSizeChart } from "@/lib/size-chart/size-chart-schemas";
import { useSaveSizeChart } from "@/lib/size-chart/use-size-charts";

type Row = SizeChartInput["rows"][number];

function emptyRow(columns: number): Row {
  return ["", ...Array<string>(columns - 1).fill("")];
}

function blankChart(): SizeChartInput {
  const columns = [...getMessages().admin.catalog.sizeChartDefaultColumns];
  return { name: "", columns, rows: [emptyRow(columns.length)] };
}

/** Message at `errors.rows[1][2]`-style paths (RHF keeps array errors by index). */
function messageAt(node: unknown, path: number[]): string | undefined {
  let current = node;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<number, unknown>)[key];
  }
  const message = (current as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}

/** First message anywhere under an error node, for the summary line. */
function firstMessage(node: unknown): string | undefined {
  if (node == null || typeof node !== "object") return undefined;
  const own = (node as { message?: unknown }).message;
  if (typeof own === "string") return own;
  for (const child of Object.values(node)) {
    const found = firstMessage(child);
    if (found) return found;
  }
  return undefined;
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
      item
        ? {
            name: item.name,
            columns: item.columns,
            rows: item.rows.map((row): Row => [row[0] ?? "", ...row.slice(1)]),
          }
        : blankChart(),
    );
  }, [open, item, form]);

  // The grid is controlled: columns and rows change shape together, which
  // registered inputs cannot follow. Re-validate live once a save was tried.
  const setGrid = (next: Pick<SizeChartInput, "columns" | "rows">) => {
    const options = { shouldDirty: true, shouldValidate: isSubmitted };
    form.setValue("columns", next.columns, options);
    form.setValue("rows", next.rows, options);
  };
  const setHeader = (index: number, value: string) =>
    setGrid({ columns: columns.with(index, value), rows });
  const setCell = (r: number, c: number, value: string) =>
    setGrid({
      columns,
      rows: rows.map((row, i) => (i === r ? (row.with(c, value) as Row) : row)),
    });
  const addRow = () =>
    setGrid({ columns, rows: [...rows, emptyRow(columns.length)] });
  const removeRow = (r: number) =>
    setGrid({ columns, rows: rows.filter((_, i) => i !== r) });
  const addColumn = () =>
    setGrid({
      columns: [...columns, ""],
      rows: rows.map((row): Row => [...row, ""]),
    });
  const removeColumn = (c: number) =>
    setGrid({
      columns: columns.filter((_, i) => i !== c),
      rows: rows.map((row) => row.filter((_, i) => i !== c) as Row),
    });

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

  const gridError =
    firstMessage(errors.columns) ?? firstMessage(errors.rows) ?? undefined;
  const headerError = (c: number) => messageAt(errors.columns, [c]);
  const cellError = (r: number, c: number) => messageAt(errors.rows, [r, c]);

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

          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-medium text-sm leading-none">
              {t.catalog.sizeChartTable}
            </legend>
            <p id="chart-grid-hint" className="text-muted-foreground text-xs">
              {t.catalog.sizeChartHint}
            </p>
            {/* Scrolls sideways on phones; the page itself never does. */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-max min-w-full border-collapse text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map((column, c) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: controlled cells, position is the identity
                      <th key={c} scope="col" className="p-1.5 text-left">
                        <div className="flex items-center gap-1">
                          <Input
                            value={column}
                            onChange={(e) => setHeader(c, e.target.value)}
                            maxLength={20}
                            autoComplete="off"
                            aria-label={format(t.catalog.columnName, {
                              index: c + 1,
                            })}
                            aria-invalid={Boolean(headerError(c))}
                            aria-describedby="chart-grid-hint"
                            className={
                              c === 0 ? "w-20 font-medium" : "w-24 font-medium"
                            }
                          />
                          {c > 0 && columns.length > SIZE_CHART_MIN_COLUMNS && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={format(t.catalog.removeColumn, {
                                name: column || c + 1,
                              })}
                              onClick={() => removeColumn(c)}
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-10 p-1.5">
                      <span className="sr-only">{t.common.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => {
                    const size =
                      row[0] || format(t.catalog.rowLabel, { index: r + 1 });
                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: controlled cells, position is the identity
                      <tr key={r} className="border-t">
                        {row.map((cell, c) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: controlled cells, position is the identity
                          <td key={c} className="p-1.5">
                            <Input
                              value={cell}
                              onChange={(e) => setCell(r, c, e.target.value)}
                              maxLength={c === 0 ? 12 : 15}
                              autoComplete="off"
                              inputMode={c === 0 ? "text" : "decimal"}
                              aria-label={
                                c === 0
                                  ? `${columns[0] ?? ""} ${r + 1}`
                                  : format(t.catalog.cellLabel, {
                                      size,
                                      column: columns[c] ?? "",
                                    })
                              }
                              aria-invalid={Boolean(cellError(r, c))}
                              className={
                                c === 0
                                  ? "w-20 font-medium font-mono"
                                  : "w-24 font-mono"
                              }
                            />
                          </td>
                        ))}
                        <td className="p-1.5 text-right">
                          {rows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={format(t.catalog.removeRow, {
                                name: size,
                              })}
                              onClick={() => removeRow(r)}
                            >
                              <X />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={rows.length >= SIZE_CHART_MAX_ROWS}
                onClick={addRow}
              >
                <Plus />
                {t.catalog.addRow}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={columns.length >= SIZE_CHART_MAX_COLUMNS}
                onClick={addColumn}
              >
                <Plus />
                {t.catalog.addColumn}
              </Button>
            </div>
            {gridError && (
              <p role="alert" className="text-destructive text-xs">
                {t.catalog.sizeChartFix} {fieldErrorText(gridError)}
              </p>
            )}
          </fieldset>

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
