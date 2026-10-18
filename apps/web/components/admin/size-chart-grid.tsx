"use client";

import {
  SIZE_CHART_MAX_COLUMNS,
  SIZE_CHART_MAX_ROWS,
  SIZE_CHART_MIN_COLUMNS,
  type SizeChartTable,
} from "@aaarchive/shared/catalog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

type Row = SizeChartTable["rows"][number];

function emptyRow(columns: number): Row {
  return ["", ...Array<string>(columns - 1).fill("")];
}

/** A new table: the PRD's usual measurements and one empty size row. */
export function blankSizeChartTable(): SizeChartTable {
  const columns = [...getAdminMessages().catalog.sizeChartDefaultColumns];
  return { columns, rows: [emptyRow(columns.length)] };
}

/** API rows (string[][]) as form rows ([label, ...cells]). */
export function toSizeChartTable(table: {
  columns: string[];
  rows: string[][];
}): SizeChartTable {
  return {
    columns: [...table.columns],
    rows: table.rows.map((row): Row => [row[0] ?? "", ...row.slice(1)]),
  };
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

type SizeChartGridProps = {
  id: string;
  value: SizeChartTable;
  onChange: (next: SizeChartTable) => void;
  /** RHF error nodes for `columns` and `rows`. */
  errors?: { columns?: unknown; rows?: unknown };
  disabled?: boolean;
};

/**
 * Editable measurement table (design.md §8 "Grid editors"). Controlled:
 * columns and rows change shape together, which registered inputs cannot
 * follow.
 */
export function SizeChartGrid({
  id,
  value: { columns, rows },
  onChange,
  errors,
  disabled,
}: SizeChartGridProps) {
  const t = getAdminMessages();
  const set = (next: SizeChartTable) => onChange(next);
  const setHeader = (index: number, v: string) =>
    set({ columns: columns.with(index, v), rows });
  const setCell = (r: number, c: number, v: string) =>
    set({
      columns,
      rows: rows.map((row, i) => (i === r ? (row.with(c, v) as Row) : row)),
    });
  const addRow = () =>
    set({ columns, rows: [...rows, emptyRow(columns.length)] });
  const removeRow = (r: number) =>
    set({ columns, rows: rows.filter((_, i) => i !== r) });
  const addColumn = () =>
    set({
      columns: [...columns, ""],
      rows: rows.map((row): Row => [...row, ""]),
    });
  const removeColumn = (c: number) =>
    set({
      columns: columns.filter((_, i) => i !== c),
      rows: rows.map((row) => row.filter((_, i) => i !== c) as Row),
    });

  const gridError = firstMessage(errors?.columns) ?? firstMessage(errors?.rows);
  const headerError = (c: number) => messageAt(errors?.columns, [c]);
  const cellError = (r: number, c: number) => messageAt(errors?.rows, [r, c]);
  const hintId = `${id}-hint`;

  return (
    <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 font-medium text-sm leading-none">
        {t.catalog.sizeChartTable}
      </legend>
      <p id={hintId} className="text-muted-foreground text-xs">
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
                      aria-describedby={hintId}
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
                        aria-label={format(t.catalog.removeRow, { name: size })}
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
  );
}
