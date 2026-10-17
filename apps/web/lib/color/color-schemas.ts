import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

export const adminColorSchema = z.object({
  id: z.string(),
  name: z.string(),
  hex: z.string(),
  sortOrder: z.number().int(),
  variantCount: z.number().int(),
});
export type AdminColor = z.infer<typeof adminColorSchema>;

export const colorPageSchema = pagedSchema(adminColorSchema);
