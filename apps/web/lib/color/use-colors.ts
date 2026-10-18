"use client";

import type {
  CatalogListQuery,
  ColorInput,
  ColorUpdate,
} from "@aaarchive/shared/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColor, deleteColor, listColors, updateColor } from "./color-api";
import { colorKeys } from "./color-keys";

export function useColors(query: CatalogListQuery = {}) {
  return useQuery({
    queryKey: colorKeys.list(query),
    queryFn: ({ signal }) => listColors(query, signal),
  });
}

/** Create (no id) or update (id); the form always sends every field. */
export function useSaveColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ColorInput }) =>
      id ? updateColor(id, body satisfies ColorUpdate) : createColor(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: colorKeys.all }),
  });
}

export function useDeleteColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteColor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: colorKeys.all }),
  });
}
