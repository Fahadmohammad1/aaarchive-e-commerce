import { z } from "zod";

// The only stock information the storefront may ever see — PRD §5.6.
export const STOCK_STATUSES = [
  "in_stock",
  "low_stock",
  "out_of_stock",
] as const;
export const stockStatusSchema = z.enum(STOCK_STATUSES);
export type StockStatus = z.infer<typeof stockStatusSchema>;

export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const DEFAULT_MAX_QTY_PER_VARIANT = 5;

/** Server-side only: turns a stock number into the public status. */
export function stockStatusFor(
  stock: number,
  threshold: number = DEFAULT_LOW_STOCK_THRESHOLD,
): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}
