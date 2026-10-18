import type {
  CatalogListQuery,
  CategoryInput,
  CategoryUpdate,
} from "@aaarchive/shared/catalog";
import { api } from "@/lib/api/api-client";
import { adminCategorySchema, categoryPageSchema } from "./category-schemas";

export function listCategories(query: CatalogListQuery, signal?: AbortSignal) {
  return api.get("/admin/categories", {
    query,
    schema: categoryPageSchema,
    signal,
  });
}

export function createCategory(body: CategoryInput) {
  return api.post("/admin/categories", { body, schema: adminCategorySchema });
}

export function updateCategory(id: string, body: CategoryUpdate) {
  return api.patch(`/admin/categories/${encodeURIComponent(id)}`, {
    body,
    schema: adminCategorySchema,
  });
}

export function deleteCategory(id: string): Promise<void> {
  return api.delete(`/admin/categories/${encodeURIComponent(id)}`);
}
