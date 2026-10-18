"use client";

import { Controller } from "react-hook-form";
import { FormField } from "@/components/admin/form-field";
import { NativeSelect } from "@/components/admin/native-select";
import {
  blankSizeChartTable,
  SizeChartGrid,
  toSizeChartTable,
} from "@/components/admin/size-chart-grid";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useSizeCharts } from "@/lib/size-chart/use-size-charts";
import type { ProductForm } from "./product-form-types";

const KINDS = ["none", "template", "custom"] as const;

export function SizeChartTab({ form }: { form: ProductForm }) {
  const t = getAdminMessages();
  const ts = t.products.sizeChart;
  const templates = useSizeCharts();
  const list = templates.data?.data ?? [];

  return (
    <Controller
      control={form.control}
      name="sizeChart"
      render={({ field, fieldState }) => {
        const value = field.value ?? { kind: "none" as const };
        const errors = fieldState.error as
          | {
              sizeChartId?: { message?: string };
              table?: { columns?: unknown; rows?: unknown };
            }
          | undefined;
        const set = (next: typeof value) =>
          field.onChange(next, { shouldValidate: form.formState.isSubmitted });
        const selected =
          value.kind === "template"
            ? list.find((c) => c.id === value.sizeChartId)
            : undefined;
        return (
          <div className="flex flex-col gap-5">
            <p className="text-muted-foreground text-sm">{ts.intro}</p>
            <fieldset className="flex flex-col gap-1">
              <legend className="sr-only">{t.products.tabs.sizeChart}</legend>
              {KINDS.map((kind) => (
                <label
                  key={kind}
                  className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="p-size-chart-kind"
                    className="size-4 accent-primary"
                    checked={value.kind === kind}
                    onChange={() =>
                      set(
                        kind === "none"
                          ? { kind }
                          : kind === "template"
                            ? { kind, sizeChartId: list[0]?.id ?? "" }
                            : { kind, table: blankSizeChartTable() },
                      )
                    }
                  />
                  {ts[kind]}
                </label>
              ))}
            </fieldset>

            {value.kind === "template" &&
              (list.length === 0 && !templates.isPending ? (
                <p className="text-muted-foreground text-sm">
                  {ts.noTemplates}
                </p>
              ) : (
                <>
                  <FormField
                    id="p-chart-template"
                    label={ts.chooseTemplate}
                    error={errors?.sizeChartId?.message}
                  >
                    <NativeSelect
                      id="p-chart-template"
                      className="sm:max-w-sm"
                      value={value.sizeChartId}
                      onChange={(e) =>
                        set({ kind: "template", sizeChartId: e.target.value })
                      }
                    >
                      {list.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormField>
                  {selected && (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-max min-w-full text-sm">
                        <caption className="sr-only">
                          {ts.templatePreview}
                        </caption>
                        <thead className="bg-muted/50">
                          <tr>
                            {selected.columns.map((c) => (
                              <th
                                key={c}
                                scope="col"
                                className="px-3 py-2 text-left font-medium"
                              >
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selected.rows.map((row) => (
                            <tr
                              key={row[0]}
                              className="border-t odd:bg-sunken/40"
                            >
                              {row.map((cell, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: read-only table
                                <td key={i} className="px-3 py-1.5 font-mono">
                                  {cell || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ))}

            {value.kind === "custom" && (
              <>
                {list.length > 0 && (
                  <FormField id="p-chart-start" label={ts.startFrom}>
                    <NativeSelect
                      id="p-chart-start"
                      className="sm:max-w-sm"
                      value=""
                      onChange={(e) => {
                        const chart = list.find((c) => c.id === e.target.value);
                        if (chart)
                          set({
                            kind: "custom",
                            table: toSizeChartTable(chart),
                          });
                      }}
                    >
                      <option value="">—</option>
                      {list.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormField>
                )}
                <SizeChartGrid
                  id="p-chart-grid"
                  value={value.table}
                  errors={errors?.table}
                  onChange={(table) => set({ kind: "custom", table })}
                />
              </>
            )}
          </div>
        );
      }}
    />
  );
}
