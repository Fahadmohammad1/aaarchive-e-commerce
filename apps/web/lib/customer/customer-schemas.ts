import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";
import { adminOrderListItemSchema } from "@/lib/order/order-schemas";

export const customerSchema = z.object({
  phone: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  orders: z.number().int(),
  delivered: z.number().int(),
  cancelledOrReturned: z.number().int(),
  successRate: z.number().int().nullable(),
  totalSpent: z.number().int(),
  firstOrderAt: z.string(),
  lastOrderAt: z.string(),
  blocked: z.boolean(),
});
export type Customer = z.infer<typeof customerSchema>;
export const customerPageSchema = pagedSchema(customerSchema);

export const customerDetailSchema = z.object({
  phone: z.string(),
  customer: customerSchema.nullable(),
  block: z
    .object({ reason: z.string(), at: z.string(), by: z.string().nullable() })
    .nullable(),
  orders: z.array(adminOrderListItemSchema),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const blockedPhoneSchema = z.object({
  id: z.string(),
  phone: z.string(),
  reason: z.string(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
});
export type BlockedPhone = z.infer<typeof blockedPhoneSchema>;
export const blockedPhonePageSchema = pagedSchema(blockedPhoneSchema);
