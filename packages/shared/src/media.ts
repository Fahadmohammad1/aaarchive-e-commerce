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

/** File extensions for the same formats (`.jpg` and `.jpeg` are both JPEG). */
export const MEDIA_ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/**
 * `accept` attribute for file inputs. Lists extensions as well as MIME types:
 * some phone and desktop pickers grey out `.jpg` files when only MIME types
 * are given.
 */
export const MEDIA_ACCEPT_ATTR = [
  ...MEDIA_ACCEPTED_TYPES,
  ...MEDIA_ACCEPTED_EXTENSIONS,
].join(",");

/** Non-standard JPEG types some browsers and Android pickers report. */
const JPEG_ALIASES = new Set(["image/jpg", "image/pjpeg"]);

/**
 * Quick browser-side check before uploading, by type or by extension. The
 * browser's `File.type` is often empty or non-standard, so either one is
 * enough here. The API decides for real by decoding the file.
 */
export function isAcceptedImageFile(file: {
  name: string;
  type: string;
}): boolean {
  const type = file.type.toLowerCase();
  if ((MEDIA_ACCEPTED_TYPES as readonly string[]).includes(type)) return true;
  if (JPEG_ALIASES.has(type)) return true;
  const name = file.name.toLowerCase();
  return MEDIA_ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

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
