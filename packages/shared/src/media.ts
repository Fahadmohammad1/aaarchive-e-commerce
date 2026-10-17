import { z } from "zod";

// Media library (docs/architecture.md §4.7a). Images are uploaded to the API,
// re-encoded to WebP renditions and stored in Supabase Storage.

export const MEDIA_PURPOSES = ["product", "content", "brand"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

/** Rendition widths, ascending. Never upscaled beyond the original. */
export const MEDIA_WIDTHS = [400, 800, 1200, 1600] as const;

/** Largest file accepted by POST /admin/media (before re-encoding). */
export const MEDIA_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Accepted upload types — checked by decoding the file, not by its name. */
export const MEDIA_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const mediaUploadFieldsSchema = z.strictObject({
  purpose: z.enum(MEDIA_PURPOSES),
});

export const mediaRenditionSchema = z.object({
  width: z.number().int().positive(),
  url: z.url(),
});

export const mediaAssetSchema = z.object({
  id: z.string(),
  purpose: z.enum(MEDIA_PURPOSES),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurDataUrl: z.string(),
  byteSize: z.number().int().nonnegative(),
  /** Largest rendition. */
  url: z.url(),
  renditions: z.array(mediaRenditionSchema).min(1),
  createdAt: z.string(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

/** Picks the smallest rendition at least `width` wide (or the largest one). */
export function pickRendition(
  renditions: readonly { width: number; url: string }[],
  width: number,
): string {
  const sorted = [...renditions].sort((a, b) => a.width - b.width);
  return (sorted.find((r) => r.width >= width) ?? sorted.at(-1))?.url ?? "";
}
