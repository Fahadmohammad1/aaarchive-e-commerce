import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

export const adminSizeChartSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  productCount: z.number().int(),
  updatedAt: z.string(),
});
export type AdminSizeChart = z.infer<typeof adminSizeChartSchema>;

export const sizeChartPageSchema = pagedSchema(adminSizeChartSchema);
