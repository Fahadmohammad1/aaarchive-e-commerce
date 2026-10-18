"use client";

import type {
  AdminProductListQuery,
  ProductInput,
  ProductUpdate,
  VariantBulkUpdate,
  VariantGenerateInput,
} from "@aaarchive/shared/product";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  deleteVariant,
  duplicateProduct,
  generateVariants,
  getProduct,
  listProducts,
  updateProduct,
  updateVariants,
} from "./product-api";
import { productKeys } from "./product-keys";
import type { AdminProduct } from "./product-schemas";

export function useProducts(query: AdminProductListQuery) {
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: ({ signal }) => listProducts(query, signal),
    // Keep the table while a new filter or page loads (no flash, no CLS).
    placeholderData: keepPreviousData,
  });
}

/** Null id (the "new product" page) never fetches. */
export function useProduct(id: string | null) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getProduct(id ?? "", signal),
    enabled: Boolean(id),
  });
}

/** Every write returns the fresh product: store it, refresh the lists. */
function useProductWrite<T>(fn: (input: T) => Promise<AdminProduct>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useCreateProduct() {
  return useProductWrite((body: ProductInput) => createProduct(body));
}

export function useUpdateProduct(id: string) {
  return useProductWrite((body: ProductUpdate) => updateProduct(id, body));
}

export function useDuplicateProduct() {
  return useProductWrite((id: string) => duplicateProduct(id));
}

export function useGenerateVariants(id: string) {
  return useProductWrite((body: VariantGenerateInput) =>
    generateVariants(id, body),
  );
}

export function useUpdateVariants(id: string) {
  return useProductWrite((body: VariantBulkUpdate) => updateVariants(id, body));
}

export function useDeleteVariant(id: string) {
  return useProductWrite((variantId: string) => deleteVariant(id, variantId));
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
