import { z } from "zod";

export const adminZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  charge: z.number().int(),
  estimatedDays: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  orderCount: z.number().int(),
  updatedAt: z.string(),
});
export type AdminZone = z.infer<typeof adminZoneSchema>;

export const zoneListSchema = z.object({ data: z.array(adminZoneSchema) });

/** GET /delivery-zones: what checkout shows. */
export type StoreZone = {
  id: string;
  name: string;
  charge: number;
  estimatedDays: string;
};
