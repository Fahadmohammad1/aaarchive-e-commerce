import type { MediaAsset } from "@aaarchive/shared/media";
import type { ProductStatus } from "@aaarchive/shared/product";
import { isSaleActive } from "@aaarchive/shared/product";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  type StockStatus,
  stockStatusFor,
} from "@aaarchive/shared/stock";
import type {
  MediaAsset as MediaAssetRow,
  Prisma,
} from "../../generated/prisma/client.js";
import type { MediaService } from "../media/media.service.js";

// ADMIN shapes only: they carry stock numbers. The public product mapper
// (Phase 3) must never reuse these (PRD §5.6).

export const productDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  collections: {
    include: { collection: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  },
  sizeChart: true,
  images: { include: { media: true }, orderBy: { sortOrder: "asc" } },
  variants: {
    include: {
      size: { select: { name: true, sortOrder: true } },
      color: { select: { name: true, hex: true, sortOrder: true } },
      _count: { select: { orderItems: true } },
    },
  },
} as const satisfies Prisma.ProductInclude;

export type ProductDetailRow = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

export const productListInclude = {
  category: { select: { id: true, name: true } },
  images: {
    include: { media: true },
    orderBy: { sortOrder: "asc" },
    take: 1,
  },
  variants: { select: { stock: true, isActive: true } },
} as const satisfies Prisma.ProductInclude;

export type ProductListRow = Prisma.ProductGetPayload<{
  include: typeof productListInclude;
}>;

export type AdminProductSizeChart =
  | { kind: "none" }
  | { kind: "template"; sizeChartId: string; name: string }
  | { kind: "custom"; table: { columns: string[]; rows: string[][] } };

export type AdminVariant = {
  id: string;
  sizeId: string;
  sizeName: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  sku: string;
  stock: number;
  stockStatus: StockStatus;
  priceOverride: number | null;
  isActive: boolean;
  /** Ordered at least once: can be deactivated but not deleted. */
  hasOrders: boolean;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  description: string | null;
  fabric: string | null;
  gsm: number | null;
  care: string | null;
  tags: string[];
  category: { id: string; name: string; slug: string };
  collections: Array<{ id: string; name: string; slug: string }>;
  basePrice: number;
  salePrice: number | null;
  saleStart: string | null;
  saleEnd: string | null;
  saleActive: boolean;
  lowStockThreshold: number | null;
  sizeChart: AdminProductSizeChart;
  images: Array<{
    id: string;
    mediaId: string;
    alt: string;
    colorId: string | null;
    media: MediaAsset;
  }>;
  variants: AdminVariant[];
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDesc: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  isFeatured: boolean;
  category: { id: string; name: string };
  basePrice: number;
  salePrice: number | null;
  saleActive: boolean;
  image: MediaAsset | null;
  variantCount: number;
  /** Sum over active variants. */
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  updatedAt: string;
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((cell) => String(cell ?? "")) : [];
}

/** The product's own threshold, else the store's (Settings → Stock, PRD §5.6 rule 2). */
export function thresholdOf(
  p: { lowStockThreshold: number | null },
  storeDefault: number = DEFAULT_LOW_STOCK_THRESHOLD,
) {
  return p.lowStockThreshold ?? storeDefault;
}

function sizeChartOf(row: ProductDetailRow): AdminProductSizeChart {
  const chart = row.sizeChart;
  if (!chart) return { kind: "none" };
  if (chart.isTemplate) {
    return { kind: "template", sizeChartId: chart.id, name: chart.name };
  }
  return {
    kind: "custom",
    table: {
      columns: strings(chart.columns),
      rows: Array.isArray(chart.rows) ? chart.rows.map(strings) : [],
    },
  };
}

export function toAdminProduct(
  row: ProductDetailRow,
  media: MediaService,
  storeThreshold?: number,
): AdminProduct {
  const threshold = thresholdOf(row, storeThreshold);
  const variants = [...row.variants].sort(
    (a, b) =>
      a.color.sortOrder - b.color.sortOrder ||
      a.color.name.localeCompare(b.color.name) ||
      a.size.sortOrder - b.size.sortOrder ||
      a.size.name.localeCompare(b.size.name),
  );
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDesc: row.shortDesc,
    description: row.description,
    fabric: row.fabric,
    gsm: row.gsm,
    care: row.care,
    tags: row.tags,
    category: row.category,
    collections: row.collections.map((c) => c.collection),
    basePrice: row.basePrice,
    salePrice: row.salePrice,
    saleStart: row.saleStart?.toISOString() ?? null,
    saleEnd: row.saleEnd?.toISOString() ?? null,
    saleActive: isSaleActive(row),
    lowStockThreshold: row.lowStockThreshold,
    sizeChart: sizeChartOf(row),
    images: row.images.map((image) => ({
      id: image.id,
      mediaId: image.mediaId,
      alt: image.alt ?? "",
      colorId: image.colorId,
      media: media.toDto(image.media),
    })),
    variants: variants.map((v) => ({
      id: v.id,
      sizeId: v.sizeId,
      sizeName: v.size.name,
      colorId: v.colorId,
      colorName: v.color.name,
      colorHex: v.color.hex,
      sku: v.sku,
      stock: v.stock,
      stockStatus: stockStatusFor(v.stock, threshold),
      priceOverride: v.priceOverride,
      isActive: v.isActive,
      hasOrders: v._count.orderItems > 0,
    })),
    status: row.status,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDesc: row.seoDesc,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminProductListItem(
  row: ProductListRow,
  media: MediaService,
  storeThreshold?: number,
): AdminProductListItem {
  const threshold = thresholdOf(row, storeThreshold);
  const active = row.variants.filter((v) => v.isActive);
  const first = row.images[0]?.media as MediaAssetRow | undefined;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    isFeatured: row.isFeatured,
    category: row.category,
    basePrice: row.basePrice,
    salePrice: row.salePrice,
    saleActive: isSaleActive(row),
    image: first ? media.toDto(first) : null,
    variantCount: row.variants.length,
    totalStock: active.reduce((sum, v) => sum + Math.max(v.stock, 0), 0),
    lowStockCount: active.filter((v) => v.stock > 0 && v.stock <= threshold)
      .length,
    outOfStockCount: active.filter((v) => v.stock <= 0).length,
    updatedAt: row.updatedAt.toISOString(),
  };
}
