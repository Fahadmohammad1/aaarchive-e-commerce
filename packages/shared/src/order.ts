import { z } from "zod";
import { BD_DISTRICTS } from "./checkout.js";
import { exportFormatSchema } from "./export.js";
import { bdPhoneSchema } from "./phone.js";

// Order lifecycle — PRD §6.4.
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const PAYMENT_STATUSES = [
  "UNPAID",
  "PENDING_VERIFICATION",
  "PAID",
  "REFUNDED",
  "PARTIALLY_PAID",
] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** SSLCommerz = online card / mobile-banking payment, off until the Owner turns it on. */
export const PAYMENT_METHODS = ["COD", "BKASH", "NAGAD", "SSLCOMMERZ"] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// ── Status flow (PRD §6.4) ─────────────────────────────────────────────────
//
//   Pending ─► Confirmed ─► Processing ─► Shipped ─► Delivered
//      └──────────┴────────────┴────────────┴──► Cancelled
//                                       Shipped ─► Returned

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED", "RETURNED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Moving into these puts the items back in stock (PRD §5.6 rule 7). */
export const STOCK_RESTORING_STATUSES: readonly OrderStatus[] = [
  "CANCELLED",
  "RETURNED",
];

/** Orders can be edited (items, address, charge) only before they ship. */
export const EDITABLE_STATUSES: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
];

const courierText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(max, { message: "TOO_LONG" });

const noteText = z
  .string()
  .trim()
  .max(500, { message: "TOO_LONG" })
  .optional()
  .transform((v) => (v ? v : undefined));

export const orderStatusChangeSchema = z
  .strictObject({
    to: orderStatusSchema,
    note: noteText,
    /** Required for SHIPPED (PRD §6.4). */
    courierName: courierText(40).optional(),
    trackingNumber: courierText(60).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.to !== "SHIPPED") return;
    if (!v.courierName) {
      ctx.addIssue({
        code: "custom",
        path: ["courierName"],
        message: "REQUIRED",
      });
    }
    if (!v.trackingNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["trackingNumber"],
        message: "REQUIRED",
      });
    }
  });
export type OrderStatusChange = z.input<typeof orderStatusChangeSchema>;

/** Bulk changes never ship: Shipped needs a courier and number per order. */
export const BULK_STATUSES = [
  "CONFIRMED",
  "PROCESSING",
  "DELIVERED",
  "CANCELLED",
] as const;
export const orderBulkStatusSchema = z.strictObject({
  ids: z.array(z.string().min(1).max(40)).min(1).max(100),
  to: z.enum(BULK_STATUSES),
  note: noteText,
});
export type OrderBulkStatus = z.input<typeof orderBulkStatusSchema>;

export const CALL_OUTCOMES = ["NO_ANSWER", "CONFIRMED", "CALL_LATER"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/** An internal note, or a call attempt with its outcome (PRD §6.4). */
export const orderNoteSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("NOTE"),
    note: z
      .string()
      .trim()
      .min(1, { message: "REQUIRED" })
      .max(1000, { message: "TOO_LONG" }),
  }),
  z.strictObject({
    type: z.literal("CALL"),
    outcome: z.enum(CALL_OUTCOMES),
    note: noteText,
  }),
]);
export type OrderNoteInput = z.input<typeof orderNoteSchema>;

// ── Admin order list (PRD §6.4) and exports (§6.9) ─────────────────────────

/** "2026-10-19": a calendar day in Asia/Dhaka. */
const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "INVALID_DATE" });

const orderFilterFields = {
  /** Order number, phone or customer name. */
  q: z.string().trim().max(60).optional(),
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  zoneId: z.string().max(40).optional(),
  from: daySchema.optional(),
  to: daySchema.optional(),
};

export const adminOrderListQuerySchema = z.strictObject({
  ...orderFilterFields,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminOrderListQuery = {
  q?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  method?: PaymentMethod;
  zoneId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export const orderExportQuerySchema = z.strictObject({
  ...orderFilterFields,
  format: exportFormatSchema,
});

/** Start (inclusive) and end (exclusive) instants of a Dhaka day range (UTC+6, no DST). */
export function dhakaRange(
  from?: string,
  to?: string,
): { gte?: Date; lt?: Date } {
  const range: { gte?: Date; lt?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00+06:00`);
  if (to) {
    const end = new Date(`${to}T00:00:00+06:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    range.lt = end;
  }
  return range;
}

// ── Editing an order before it ships (PRD §6.4) ────────────────────────────

export const orderEditSchema = z
  .strictObject({
    /** The whole new list of lines; prices of kept lines do not change. */
    items: z
      .array(
        z.strictObject({
          variantId: z.string().trim().min(1).max(40),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1, { message: "CART_EMPTY" })
      .max(20)
      .refine(
        (items) => new Set(items.map((i) => i.variantId)).size === items.length,
        {
          message: "DUPLICATE_ITEM",
        },
      ),
    customerName: z
      .string()
      .trim()
      .min(2, { message: "TOO_SHORT" })
      .max(60, { message: "TOO_LONG" }),
    altPhone: bdPhoneSchema.nullable(),
    zoneId: z.string().min(1, { message: "REQUIRED" }),
    district: z.enum(BD_DISTRICTS, { message: "REQUIRED" }),
    area: z
      .string()
      .trim()
      .min(2, { message: "TOO_SHORT" })
      .max(80, { message: "TOO_LONG" }),
    address: z
      .string()
      .trim()
      .min(5, { message: "TOO_SHORT" })
      .max(200, { message: "TOO_LONG" }),
    deliveryCharge: z.number().int().min(0).max(100_000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "NOTHING_TO_CHANGE" });
export type OrderEditInput = z.input<typeof orderEditSchema>;

// ── Payments (PRD §6.4): manual bKash/Nagad checks ─────────────────────────

/** Methods that create a Payment record: the wallets and SSLCommerz (online). */
export const PAYMENT_RECORD_METHODS = ["BKASH", "NAGAD", "SSLCOMMERZ"] as const;
export type PaymentRecordMethod = (typeof PAYMENT_RECORD_METHODS)[number];

export const PAYMENT_RECORD_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const paymentVerifySchema = z.strictObject({ note: noteText });
/** Rejecting needs a reason the team can read later. */
export const paymentRejectSchema = z.strictObject({
  note: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(500, { message: "TOO_LONG" }),
});

const paymentFilterFields = {
  /** Order number, TrxID or sender number. */
  q: z.string().trim().max(60).optional(),
  status: z.enum(PAYMENT_RECORD_STATUSES).optional(),
  method: z.enum(PAYMENT_RECORD_METHODS).optional(),
  from: daySchema.optional(),
  to: daySchema.optional(),
};
export const paymentListQuerySchema = z.strictObject({
  ...paymentFilterFields,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaymentListQuery = {
  q?: string;
  status?: PaymentRecordStatus;
  method?: PaymentRecordMethod;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};
export const paymentExportQuerySchema = z.strictObject({
  ...paymentFilterFields,
  format: exportFormatSchema,
});
