import { z } from "zod";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_MAX_QTY_PER_VARIANT,
} from "./stock.js";

// Store settings (PRD §6.8), one `Setting` row per key. Every schema fills in
// defaults, so a missing or older row still reads as a complete value. The
// dashboard forms for these arrive in Phase 6; checkout reads them now.

const walletSchema = z.object({
  enabled: z.boolean().default(true),
  /** The store's bKash/Nagad number customers send money to. */
  number: z.string().trim().max(20).default(""),
  /** Extra steps shown under the number ("Use Send Money…"). */
  instructions: z.string().trim().max(500).default(""),
});

export const paymentSettingsSchema = z.object({
  cod: z.object({ enabled: z.boolean().default(true) }).default({
    enabled: true,
  }),
  bkash: walletSchema.default({ enabled: true, number: "", instructions: "" }),
  nagad: walletSchema.default({ enabled: true, number: "", instructions: "" }),
  /** COD orders must pay the delivery charge in advance by bKash/Nagad (PRD §5.8). */
  codAdvanceDeliveryCharge: z.boolean().default(false),
});
export type PaymentSettings = z.output<typeof paymentSettingsSchema>;

export const stockSettingsSchema = z.object({
  lowStockThreshold: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(DEFAULT_LOW_STOCK_THRESHOLD),
  maxQtyPerVariant: z
    .number()
    .int()
    .min(1)
    .max(99)
    .default(DEFAULT_MAX_QTY_PER_VARIANT),
});
export type StockSettings = z.output<typeof stockSettingsSchema>;

export const deliverySettingsSchema = z.object({
  /** Orders whose goods total reaches this get free delivery; null = never. */
  freeDeliveryThreshold: z.number().int().min(1).nullable().default(null),
});
export type DeliverySettings = z.output<typeof deliverySettingsSchema>;

/** A wallet is offered only when it is switched on and has a number to pay. */
export function walletAvailable(wallet: PaymentSettings["bkash"]): boolean {
  return wallet.enabled && wallet.number.length > 0;
}
