import type {
  CatalogListQuery,
  SizeInput,
  SizeUpdate,
} from "@aaarchive/shared/catalog";
import { api } from "@/lib/api/api-client";
import { adminSizeSchema, sizePageSchema } from "./size-schemas";

export function listSizes(query: CatalogListQuery, signal?: AbortSignal) {
  return api.get("/admin/sizes", {
    query,
    schema: sizePageSchema,
    signal,
  });
}

export function createSize(body: SizeInput) {
  return api.post("/admin/sizes", { body, schema: adminSizeSchema });
}

export function updateSize(id: string, body: SizeUpdate) {
  return api.patch(`/admin/sizes/${encodeURIComponent(id)}`, {
    body,
    schema: adminSizeSchema,
  });
}

export function deleteSize(id: string): Promise<void> {
  return api.delete(`/admin/sizes/${encodeURIComponent(id)}`);
}
