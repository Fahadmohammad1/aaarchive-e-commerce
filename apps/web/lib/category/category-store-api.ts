import { cacheTags } from "@aaarchive/shared/cache-tags";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/api-client";
import { storeGroupSchema } from "@/lib/collection/collection-store-api";

export async function getStoreCategories() {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.categories);
  return api.get("/categories", { schema: z.array(storeGroupSchema) });
}
