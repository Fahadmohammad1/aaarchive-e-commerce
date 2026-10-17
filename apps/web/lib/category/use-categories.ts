"use client";

import type {
  CatalogListQuery,
  CategoryInput,
  CategoryUpdate,
} from "@aaarchive/shared/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./category-api";
import { categoryKeys } from "./category-keys";

export function useCategories(query: CatalogListQuery = {}) {
  return useQuery({
    queryKey: categoryKeys.list(query),
    queryFn: ({ signal }) => listCategories(query, signal),
  });
}

/** Create (no id) or update (id); the form always sends every field. */
export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CategoryInput }) =>
      id
        ? updateCategory(id, body satisfies CategoryUpdate)
        : createCategory(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
