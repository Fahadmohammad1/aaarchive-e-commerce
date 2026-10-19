import { z } from "zod";
import { exportFormatSchema } from "./export.js";
import { bdPhoneSchema } from "./phone.js";

// Customers are grouped by phone number, guests included (PRD §6.5).

const customerFilterFields = {
  /** Phone digits or name. */
  q: z.string().trim().max(60).optional(),
  blocked: z.enum(["1", "0"]).optional(),
};

export const customerListQuerySchema = z.strictObject({
  ...customerFilterFields,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CustomerListQuery = {
  q?: string;
  blocked?: "1" | "0";
  page?: number;
  limit?: number;
};
export const customerExportQuerySchema = z.strictObject({
  ...customerFilterFields,
  format: exportFormatSchema,
});

/**
 * Share of finished orders that were delivered: delivered ÷ (delivered +
 * cancelled + returned), as a whole percent; null before any order finished.
 */
export function successRate(delivered: number, failed: number): number | null {
  const finished = delivered + failed;
  return finished === 0 ? null : Math.round((delivered / finished) * 100);
}

export const blockPhoneSchema = z.strictObject({
  phone: bdPhoneSchema,
  reason: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(200, { message: "TOO_LONG" }),
});
export type BlockPhoneInput = z.input<typeof blockPhoneSchema>;

export const blockedPhoneListQuerySchema = z.strictObject({
  q: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
