import {
  cellOf,
  type ExportCell,
  type ExportColumn,
} from "./export-columns.js";

/** Excel needs the BOM to read UTF-8 (Bangla names) correctly. */
export const CSV_BOM = "﻿";

/**
 * Text that a spreadsheet would run as a formula gets a leading apostrophe
 * (CSV injection, PRD §6.9 rule 4). Numbers are never touched, so −250 stays
 * a number.
 */
export function guardFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** RFC 4180: quote when needed, double inner quotes. */
export function csvField(cell: ExportCell): string {
  if (cell === null) return "";
  if (typeof cell === "number") return String(cell);
  const text = guardFormula(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Excel drops the leading 0 of a phone number when it opens a CSV
 * (01712… → 1712…). A text formula `="01712…"` keeps it in Excel, Google
 * Sheets and LibreOffice. Only all-digit values get it, so nothing a
 * customer typed can become a formula.
 */
export function csvPhone(cell: ExportCell): string {
  if (typeof cell === "string" && /^\d+$/.test(cell)) {
    return `"=""${cell}"""`;
  }
  return csvField(cell);
}

export function csvLine(
  cells: ExportCell[],
  types?: ReadonlyArray<ExportColumn<unknown>["type"]>,
): string {
  const fields = cells.map((cell, i) =>
    types?.[i] === "phone" ? csvPhone(cell) : csvField(cell),
  );
  return `${fields.join(",")}\r\n`;
}

/** BOM + header, then one line per row, as chunks to stream. */
export async function* csvChunks<T>(
  columns: ExportColumn<T>[],
  rows: AsyncIterable<T>,
): AsyncGenerator<string> {
  yield CSV_BOM + csvLine(columns.map((c) => c.header));
  const types = columns.map((c) => c.type);
  let buffer = "";
  for await (const row of rows) {
    buffer += csvLine(
      columns.map((c) => cellOf(c, row)),
      types,
    );
    if (buffer.length > 64_000) {
      yield buffer;
      buffer = "";
    }
  }
  if (buffer) yield buffer;
}
