import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

export const adminSizeSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  variantCount: z.number().int(),
});
export type AdminSize = z.infer<typeof adminSizeSchema>;

export const sizePageSchema = pagedSchema(adminSizeSchema);
