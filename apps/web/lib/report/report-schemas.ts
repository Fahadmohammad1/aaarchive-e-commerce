import { ORDER_STATUSES, PAYMENT_METHODS } from "@aaarchive/shared/order";
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

const salesTotals = z.object({
  orders: z.number().int(),
  validOrders: z.number().int(),
  grossSales: z.number().int(),
  revenue: z.number().int(),
  pending: z.number().int(),
  discount: z.number().int(),
  deliveryCharges: z.number().int(),
  unitsSold: z.number().int(),
  delivered: z.number().int(),
  cancelled: z.number().int(),
  returned: z.number().int(),
});
export type SalesTotals = z.infer<typeof salesTotals>;

const unitsByName = z.array(
  z.object({ name: z.string(), quantity: z.number().int() }),
);

/** GET /admin/reports/sales (Owner only). */
export const salesReportSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    days: z.array(z.string()),
    previousFrom: z.string(),
    previousTo: z.string(),
  }),
  totals: salesTotals,
  previous: salesTotals,
  daily: z.array(
    z.object({
      date: z.string(),
      orders: z.number().int(),
      grossSales: z.number().int(),
      revenue: z.number().int(),
    }),
  ),
  byStatus: z.array(
    z.object({
      status: z.enum(ORDER_STATUSES),
      orders: z.number().int(),
      value: z.number().int(),
    }),
  ),
  byPaymentMethod: z.array(
    z.object({
      method: z.enum(PAYMENT_METHODS),
      orders: z.number().int(),
      value: z.number().int(),
    }),
  ),
  byZone: z.array(
    z.object({
      zoneId: z.string(),
      name: z.string(),
      orders: z.number().int(),
      value: z.number().int(),
    }),
  ),
  topProducts: z.array(
    z.object({
      productId: z.string().nullable(),
      productName: z.string(),
      quantity: z.number().int(),
      revenue: z.number().int(),
    }),
  ),
  byCategory: z.array(
    z.object({
      categoryId: z.string().nullable(),
      name: z.string().nullable(),
      quantity: z.number().int(),
      revenue: z.number().int(),
    }),
  ),
  bySize: unitsByName,
  byColor: unitsByName,
  coupons: z.array(
    z.object({
      code: z.string(),
      orders: z.number().int(),
      discount: z.number().int(),
    }),
  ),
  customers: z.object({
    total: z.number().int(),
    new: z.number().int(),
    returning: z.number().int(),
  }),
  generatedAt: z.string(),
});
export type SalesReport = z.infer<typeof salesReportSchema>;
