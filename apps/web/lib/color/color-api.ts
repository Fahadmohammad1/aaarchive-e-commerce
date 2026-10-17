import type {
  CatalogListQuery,
  ColorInput,
  ColorUpdate,
} from "@aaarchive/shared/catalog";
import { api } from "@/lib/api/api-client";
import { adminColorSchema, colorPageSchema } from "./color-schemas";

export function listColors(query: CatalogListQuery, signal?: AbortSignal) {
  return api.get("/admin/colors", {
    query,
    schema: colorPageSchema,
    signal,
  });
}

export function createColor(body: ColorInput) {
  return api.post("/admin/colors", { body, schema: adminColorSchema });
}

export function updateColor(id: string, body: ColorUpdate) {
  return api.patch(`/admin/colors/${encodeURIComponent(id)}`, {
    body,
    schema: adminColorSchema,
  });
}

export function deleteColor(id: string): Promise<void> {
  return api.delete(`/admin/colors/${encodeURIComponent(id)}`);
}
