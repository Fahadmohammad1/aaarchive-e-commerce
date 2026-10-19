// One column definition per export, shared by the CSV and Excel writers
// (docs/architecture.md §4.8).

/** "phone": digits kept as text with their leading 0 (01712…), even in CSV. */
export type ExportCellType = "text" | "number" | "money" | "date" | "phone";

export type ExportColumn<T> = {
  header: string;
  type: ExportCellType;
  /** Excel width in characters. */
  width?: number;
  value: (row: T) => string | number | Date | null | undefined;
};

export type ExportCell = string | number | null;

const dhaka = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-19 08:05" in Asia/Dhaka (PRD §6.9 rule 3). */
export function formatExportDate(date: Date): string {
  const p = Object.fromEntries(
    dhaka.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** "2026-10-19" in Asia/Dhaka, for file names. */
export function exportDateStamp(date: Date = new Date()): string {
  return formatExportDate(date).slice(0, 10);
}

/**
 * The cell as written: money and numbers stay numbers (whole taka, no ৳, so
 * spreadsheets can sum them), dates become Dhaka-time text.
 */
export function cellOf<T>(column: ExportColumn<T>, row: T): ExportCell {
  const value = column.value(row);
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return formatExportDate(value);
  if (column.type === "number" || column.type === "money") {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : String(value);
  }
  return String(value);
}
