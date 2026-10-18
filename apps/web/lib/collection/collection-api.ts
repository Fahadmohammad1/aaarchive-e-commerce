import type {
  CatalogListQuery,
  CollectionInput,
  CollectionUpdate,
} from "@aaarchive/shared/catalog";
import { api } from "@/lib/api/api-client";
import {
  adminCollectionSchema,
  collectionPageSchema,
} from "./collection-schemas";

export function listCollections(query: CatalogListQuery, signal?: AbortSignal) {
  return api.get("/admin/collections", {
    query,
    schema: collectionPageSchema,
    signal,
  });
}

export function createCollection(body: CollectionInput) {
  return api.post("/admin/collections", {
    body,
    schema: adminCollectionSchema,
  });
}

export function updateCollection(id: string, body: CollectionUpdate) {
  return api.patch(`/admin/collections/${encodeURIComponent(id)}`, {
    body,
    schema: adminCollectionSchema,
  });
}

export function deleteCollection(id: string): Promise<void> {
  return api.delete(`/admin/collections/${encodeURIComponent(id)}`);
}
