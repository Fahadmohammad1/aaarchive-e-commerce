"use client";

import type {
  CatalogListQuery,
  SizeInput,
  SizeUpdate,
} from "@aaarchive/shared/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSize, deleteSize, listSizes, updateSize } from "./size-api";
import { sizeKeys } from "./size-keys";

export function useSizes(query: CatalogListQuery = {}) {
  return useQuery({
    queryKey: sizeKeys.list(query),
    queryFn: ({ signal }) => listSizes(query, signal),
  });
}

/** Create (no id) or update (id); the form always sends every field. */
export function useSaveSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SizeInput }) =>
      id ? updateSize(id, body satisfies SizeUpdate) : createSize(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sizeKeys.all }),
  });
}

export function useDeleteSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSize,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sizeKeys.all }),
  });
}
