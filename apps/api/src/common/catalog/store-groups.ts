import type { MediaAsset } from "@aaarchive/shared/media";
import type { MediaService } from "../../modules/media/media.service.js";

/** Public category / collection (PRD §5.2, §5.3): product counts, never stock. */
export type StoreGroup = {
  slug: string;
  name: string;
  description: string | null;
  image: { media: MediaAsset; alt: string } | null;
  /** Published products only. */
  productCount: number;
};

/** Prisma select shared by categories and collections. */
export const storeGroupSelect = {
  slug: true,
  name: true,
  description: true,
  imageAlt: true,
  imageMedia: true,
} as const;

export function toStoreGroup(
  row: {
    slug: string;
    name: string;
    description: string | null;
    imageAlt: string | null;
    imageMedia: Parameters<MediaService["toDto"]>[0] | null;
  },
  productCount: number,
  media: MediaService,
): StoreGroup {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    image: row.imageMedia
      ? { media: media.toDto(row.imageMedia), alt: row.imageAlt ?? row.name }
      : null,
    productCount,
  };
}
