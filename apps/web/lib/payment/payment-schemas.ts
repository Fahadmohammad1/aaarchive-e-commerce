import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_RECORD_STATUSES,
} from "@aaarchive/shared/order";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

export const adminPaymentSchema = z.object({
  id: z.string(),
  method: z.enum(PAYMENT_METHODS),
  amount: z.number().int(),
  senderNumber: z.string().nullable(),
  trxId: z.string().nullable(),
  status: z.enum(PAYMENT_RECORD_STATUSES),
  note: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable(),
  createdAt: z.string(),
  order: z.object({
    id: z.string(),
    orderNumber: z.string(),
    customerName: z.string(),
    phone: z.string(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    status: z.enum(ORDER_STATUSES),
    total: z.number().int(),
  }),
  isAdvance: z.boolean(),
});
export type AdminPayment = z.infer<typeof adminPaymentSchema>;
export const paymentPageSchema = pagedSchema(adminPaymentSchema);
