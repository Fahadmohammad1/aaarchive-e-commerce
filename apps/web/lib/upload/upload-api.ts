import {
  type MediaAsset,
  type MediaPurpose,
  mediaAssetSchema,
} from "@aaarchive/shared/media";
import { api } from "@/lib/api/api-client";
import { pagedSchema } from "@/lib/api/paged";

const mediaPageSchema = pagedSchema(mediaAssetSchema);

/** Sends a photo to the API's media pipeline (docs/architecture.md §4.7a). */
export function uploadMedia(
  file: File,
  purpose: MediaPurpose,
): Promise<MediaAsset> {
  const body = new FormData();
  body.set("purpose", purpose);
  body.set("file", file);
  // Large phone photos on slow mobile data need longer than the default.
  return api.post("/admin/media", {
    body,
    schema: mediaAssetSchema,
    timeoutMs: 120_000,
  });
}

export function listMedia(
  purpose: MediaPurpose | undefined,
  page: number,
  signal?: AbortSignal,
) {
  return api.get("/admin/media", {
    query: { purpose, page, limit: 40 },
    schema: mediaPageSchema,
    signal,
  });
}
