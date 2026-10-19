import { ORDER_STATUSES } from "@aaarchive/shared/order";
import { z } from "zod";

const period = z.object({
  orders: z.number().int(),
  revenue: z.number().int(),
  pending: z.number().int(),
});

/** GET /admin/reports/summary (PRD §6.1). */
export const reportSummarySchema = z.object({
  today: period,
  month: period,
  byStatus: z.array(
    z.object({ status: z.enum(ORDER_STATUSES), count: z.number().int() }),
  ),
  paymentsAwaiting: z.number().int(),
  lowStockThreshold: z.number().int(),
  lowStock: z.array(
    z.object({
      variantId: z.string(),
      productId: z.string(),
      productName: z.string(),
      sku: z.string(),
      sizeName: z.string(),
      colorName: z.string(),
      stock: z.number().int(),
    }),
  ),
  bestSellers: z.array(
    z.object({
      productId: z.string().nullable(),
      productName: z.string(),
      quantity: z.number().int(),
      revenue: z.number().int(),
    }),
  ),
  generatedAt: z.string(),
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;
