import type { SizeChart } from "../../generated/prisma/client.js";

export type AdminSizeChart = {
  id: string;
  name: string;
  /** First entry is the size column ("Size"), the rest are measurements. */
  columns: string[];
  /** [size label, ...measurements in inches]; "" when not measured. */
  rows: string[][];
  productCount: number;
  updatedAt: string;
};

export const sizeChartInclude = {
  _count: { select: { products: true } },
} as const;

/**
 * Charts are only written through `sizeChartInputSchema`; the guards here
 * keep a hand-edited row from breaking the dashboard.
 */
function toStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((cell) => String(cell ?? "")) : [];
}

export function toAdminSizeChart(
  row: SizeChart & { _count: { products: number } },
): AdminSizeChart {
  return {
    id: row.id,
    name: row.name,
    columns: toStrings(row.columns),
    rows: Array.isArray(row.rows) ? row.rows.map(toStrings) : [],
    productCount: row._count.products,
    updatedAt: row.updatedAt.toISOString(),
  };
}
