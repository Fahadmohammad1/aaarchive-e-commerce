import { z } from "zod";

/** `{ data, meta }` envelope of every paged list (docs/architecture.md §2.2). */
export function pagedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
    }),
  });
}
