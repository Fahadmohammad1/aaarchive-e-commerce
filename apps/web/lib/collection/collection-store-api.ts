import { cacheTags } from "@aaarchive/shared/cache-tags";
import { mediaAssetSchema } from "@aaarchive/shared/media";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/api-client";

/** Public category or collection: product count, never stock. */
export const storeGroupSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  image: z.object({ media: mediaAssetSchema, alt: z.string() }).nullable(),
  productCount: z.number().int(),
});
export type StoreGroup = z.infer<typeof storeGroupSchema>;

export async function getStoreCollections() {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.collections);
  return api.get("/collections", { schema: z.array(storeGroupSchema) });
}
