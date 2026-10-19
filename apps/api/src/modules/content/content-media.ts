import type { MediaAsset } from "@aaarchive/shared/media";
import type { PrismaService } from "../../prisma/prisma.service.js";
import type { MediaService } from "../media/media.service.js";

// Content blocks and settings store images as { mediaId, alt } inside JSON.
// These helpers find every such reference and resolve them in one query.

export type StoredImage = { mediaId: string; alt: string };
export type ResolvedImage = { media: MediaAsset; alt: string };
export type MediaMap = Map<string, MediaAsset>;

/** Every mediaId anywhere inside a JSON value. */
export function collectMediaIds(value: unknown, out = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const v of value) collectMediaIds(v, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "mediaId" && typeof v === "string") out.add(v);
      else collectMediaIds(v, out);
    }
  }
  return out;
}

export async function loadMedia(
  prisma: PrismaService,
  media: MediaService,
  ids: Iterable<string>,
): Promise<MediaMap> {
  const list = [...new Set(ids)];
  if (list.length === 0) return new Map();
  const rows = await prisma.mediaAsset.findMany({
    where: { id: { in: list } },
  });
  return new Map(rows.map((r) => [r.id, media.toDto(r)]));
}

/** `{ mediaId, alt }` → `{ media, alt }`, or null when the asset is gone. */
export function resolveImage(
  map: MediaMap,
  image: StoredImage | null | undefined,
): ResolvedImage | null {
  if (!image) return null;
  const asset = map.get(image.mediaId);
  return asset ? { media: asset, alt: image.alt } : null;
}
