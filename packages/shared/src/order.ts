import { z } from "zod";

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

export const PAYMENT_METHODS = ["COD", "BKASH", "NAGAD"] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
