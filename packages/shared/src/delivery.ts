import { z } from "zod";
import { PRICE_MAX } from "./product.js";

// Delivery zones (PRD §5.8, §6.8): set in the dashboard, picked at checkout.

const zoneFields = {
  /** "Inside Dhaka", "Dhaka Suburbs", "Outside Dhaka"… */
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(40, { message: "TOO_LONG" }),
  /** Whole taka; 0 = free delivery in this zone. */
  charge: z
    .number({ message: "REQUIRED" })
    .int({ message: "WHOLE_TAKA" })
    .min(0, { message: "TOO_SMALL" })
    .max(PRICE_MAX, { message: "TOO_BIG" }),
  /** Shown to customers, e.g. "1–2 days". */
  estimatedDays: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(30, { message: "TOO_LONG" }),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
};

export const deliveryZoneInputSchema = z.strictObject({
  ...zoneFields,
  sortOrder: zoneFields.sortOrder.default(0),
  isActive: zoneFields.isActive.default(true),
});
export type DeliveryZoneInput = z.input<typeof deliveryZoneInputSchema>;
// No defaults here: in Zod 4 a default inside `.partial()` would reset fields.
export const deliveryZoneUpdateSchema = z.strictObject(zoneFields).partial();
export type DeliveryZoneUpdate = z.input<typeof deliveryZoneUpdateSchema>;

/**
 * Delivery charge for an order (PRD §6.8): the zone's charge, or 0 when the
 * store's free-delivery threshold is set and the goods total (after any
 * discount) reaches it.
 */
export function deliveryChargeFor(
  zoneCharge: number,
  goodsTotal: number,
  freeDeliveryThreshold: number | null,
): number {
  if (freeDeliveryThreshold != null && goodsTotal >= freeDeliveryThreshold) {
    return 0;
  }
  return zoneCharge;
}
