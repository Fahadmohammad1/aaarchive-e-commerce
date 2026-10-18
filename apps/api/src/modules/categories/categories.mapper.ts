import type { MediaAsset as MediaAssetRow } from "../../generated/prisma/client.js";
import type { ImageRef, MediaService } from "../media/media.service.js";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageAlt: string | null;
  sortOrder: number;
  showOnHome: boolean;
  createdAt: Date;
  updatedAt: Date;
  imageMedia: MediaAssetRow | null;
  _count: { products: number };
};

/** Admin response for one category (fields picked, never a spread row). */
export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: ImageRef | null;
  sortOrder: number;
  showOnHome: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export const categoryInclude = {
  imageMedia: true,
  _count: { select: { products: true } },
} as const;

export function toAdminCategory(
  row: CategoryRow,
  media: MediaService,
): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: media.toImageRef(row.imageMedia, row.imageAlt),
    sortOrder: row.sortOrder,
    showOnHome: row.showOnHome,
    productCount: row._count.products,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
