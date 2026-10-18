"use client";

import type {
  CatalogListQuery,
  CollectionInput,
  CollectionUpdate,
} from "@aaarchive/shared/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "./collection-api";
import { collectionKeys } from "./collection-keys";

export function useCollections(query: CatalogListQuery = {}) {
  return useQuery({
    queryKey: collectionKeys.list(query),
    queryFn: ({ signal }) => listCollections(query, signal),
  });
}

/** Create (no id) or update (id); the form always sends every field. */
export function useSaveCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CollectionInput }) =>
      id
        ? updateCollection(id, body satisfies CollectionUpdate)
        : createCollection(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCollection,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}
