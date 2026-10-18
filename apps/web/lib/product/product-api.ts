import type {
  AdminProductListQuery,
  ProductInput,
  ProductUpdate,
  VariantBulkUpdate,
  VariantGenerateInput,
} from "@aaarchive/shared/product";
import { api } from "@/lib/api/api-client";
import { adminProductSchema, productPageSchema } from "./product-schemas";

const path = (id: string) => `/admin/products/${encodeURIComponent(id)}`;

export function listProducts(
  query: AdminProductListQuery,
  signal?: AbortSignal,
) {
  return api.get("/admin/products", {
    query,
    schema: productPageSchema,
    signal,
  });
}

export function getProduct(id: string, signal?: AbortSignal) {
  return api.get(path(id), { schema: adminProductSchema, signal });
}

export function createProduct(body: ProductInput) {
  return api.post("/admin/products", { body, schema: adminProductSchema });
}

export function updateProduct(id: string, body: ProductUpdate) {
  return api.patch(path(id), { body, schema: adminProductSchema });
}

export function deleteProduct(id: string): Promise<void> {
  return api.delete(path(id));
}

export function duplicateProduct(id: string) {
  return api.post(`${path(id)}/duplicate`, { schema: adminProductSchema });
}

export function generateVariants(id: string, body: VariantGenerateInput) {
  return api.post(`${path(id)}/variants`, { body, schema: adminProductSchema });
}

export function updateVariants(id: string, body: VariantBulkUpdate) {
  return api.patch(`${path(id)}/variants`, {
    body,
    schema: adminProductSchema,
  });
}

export function deleteVariant(id: string, variantId: string) {
  return api.delete(`${path(id)}/variants/${encodeURIComponent(variantId)}`, {
    schema: adminProductSchema,
  });
}
