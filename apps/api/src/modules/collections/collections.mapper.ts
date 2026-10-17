import type { MediaAsset as MediaAssetRow } from "../../generated/prisma/client.js";
import type { ImageRef, MediaService } from "../media/media.service.js";

export type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageAlt: string | null;
  sortOrder: number;
  showOnHome: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  imageMedia: MediaAssetRow | null;
  _count: { products: number };
};

/** Admin response for one collection (fields picked, never a spread row). */
export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ImageRef | null;
  sortOrder: number;
  showOnHome: boolean;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export const collectionInclude = {
  imageMedia: true,
  _count: { select: { products: true } },
} as const;

export function toAdminCollection(
  row: CollectionRow,
  media: MediaService,
): AdminCollection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: media.toImageRef(row.imageMedia, row.imageAlt),
    sortOrder: row.sortOrder,
    showOnHome: row.showOnHome,
    isActive: row.isActive,
    productCount: row._count.products,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
