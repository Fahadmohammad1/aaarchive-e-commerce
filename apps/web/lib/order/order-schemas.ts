import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_RECORD_STATUSES,
  PAYMENT_STATUSES,
} from "@aaarchive/shared/order";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

// Admin order responses (apps/api admin-orders.mapper.ts). Dashboard only.

const status = z.enum(ORDER_STATUSES);
const paymentStatus = z.enum(PAYMENT_STATUSES);
const method = z.enum(PAYMENT_METHODS);

export const adminOrderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  createdAt: z.string(),
  status,
  paymentStatus,
  paymentMethod: method,
  customerName: z.string(),
  phone: z.string(),
  district: z.string(),
  zoneName: z.string(),
  total: z.number().int(),
  itemCount: z.number().int(),
});
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;
export const orderPageSchema = pagedSchema(adminOrderListItemSchema);

export const adminOrderSchema = adminOrderListItemSchema.extend({
  updatedAt: z.string(),
  altPhone: z.string().nullable(),
  email: z.string().nullable(),
  zone: z.object({
    id: z.string(),
    name: z.string(),
    charge: z.number().int(),
  }),
  area: z.string(),
  address: z.string(),
  note: z.string().nullable(),
  subtotal: z.number().int(),
  discount: z.number().int(),
  deliveryCharge: z.number().int(),
  couponCode: z.string().nullable(),
  courierName: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      variantId: z.string().nullable(),
      productName: z.string(),
      sizeName: z.string(),
      colorName: z.string(),
      sku: z.string(),
      unitPrice: z.number().int(),
      quantity: z.number().int(),
      lineTotal: z.number().int(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string(),
      method,
      amount: z.number().int(),
      senderNumber: z.string().nullable(),
      trxId: z.string().nullable(),
      status: z.enum(PAYMENT_RECORD_STATUSES),
      note: z.string().nullable(),
      verifiedAt: z.string().nullable(),
      verifiedBy: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["STATUS", "NOTE", "CALL", "PAYMENT", "EDIT"]),
      from: z.string().nullable(),
      to: z.string().nullable(),
      note: z.string().nullable(),
      by: z.string().nullable(),
      at: z.string(),
    }),
  ),
  nextStatuses: z.array(status),
  editable: z.boolean(),
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;

export const bulkResultSchema = z.object({
  results: z.array(
    z.object({ id: z.string(), ok: z.boolean(), code: z.string().optional() }),
  ),
});
