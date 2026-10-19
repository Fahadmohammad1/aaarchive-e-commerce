import type { MediaAsset } from "@aaarchive/shared/media";
import { currentPrice, isSaleActive } from "@aaarchive/shared/product";
import {
  DEFAULT_MAX_QTY_PER_VARIANT,
  type StockStatus,
  stockStatusFor,
} from "@aaarchive/shared/stock";
import { variantPrice } from "@aaarchive/shared/storefront";
import type { Prisma } from "../../generated/prisma/client.js";
import type { MediaService } from "../media/media.service.js";
import { thresholdOf } from "./products.mapper.js";

// PUBLIC shapes (PRD §5.6): fields are picked one by one, never spread from
// a row, and no stock number ever leaves through them. Only active variants
// of PUBLISHED products are shown. `store-products.mapper.spec.ts` checks
// that no `stock` key appears anywhere.

type StoreImage = { media: MediaAsset; alt: string };

export type StoreProductSummary = {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  price: number;
  compareAt: number | null;
  image: StoreImage | null;
  hoverImage: StoreImage | null;
  colors: Array<{ name: string; hex: string }>;
  /** out_of_stock only when every active variant is (PRD §5.6 rule 3). */
  stockStatus: Extract<StockStatus, "in_stock" | "out_of_stock">;
};

export type StoreProduct = {
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string | null;
  fabric: string | null;
  gsm: number | null;
  care: string | null;
  category: { slug: string; name: string };
  price: number;
  compareAt: number | null;
  /** ISO end of a running sale with an end date, else null. */
  saleEndsAt: string | null;
  images: Array<StoreImage & { colorId: string | null }>;
  colors: Array<{ id: string; name: string; hex: string }>;
  sizes: Array<{ id: string; name: string }>;
  /** Prices per variant; stock status comes from GET /products/:slug/stock. */
  variants: Array<{
    id: string;
    sizeId: string;
    colorId: string;
    price: number;
    compareAt: number | null;
  }>;
  sizeChart: { columns: string[]; rows: string[][] } | null;
  maxQtyPerVariant: number;
  seo: { title: string | null; description: string | null };
  updatedAt: string;
};

export type StoreProductStock = {
  variants: Array<{ id: string; stockStatus: StockStatus }>;
};

const imageInclude = {
  include: { media: true },
  orderBy: { sortOrder: "asc" },
} as const;

const activeVariants = { where: { isActive: true } } as const;

export const storeSummaryInclude = {
  category: { select: { slug: true, name: true } },
  images: { ...imageInclude, take: 2 },
  variants: {
    ...activeVariants,
    // `stock` is read to compute the status and dropped by the mapper.
    select: {
      stock: true,
      color: { select: { name: true, hex: true, sortOrder: true } },
    },
  },
} as const satisfies Prisma.ProductInclude;

export type StoreSummaryRow = Prisma.ProductGetPayload<{
  include: typeof storeSummaryInclude;
}>;

export const storeProductInclude = {
  category: { select: { slug: true, name: true } },
  images: imageInclude,
  sizeChart: { select: { columns: true, rows: true } },
  variants: {
    ...activeVariants,
    select: {
      id: true,
      sizeId: true,
      colorId: true,
      priceOverride: true,
      size: { select: { id: true, name: true, sortOrder: true } },
      color: { select: { id: true, name: true, hex: true, sortOrder: true } },
    },
  },
} as const satisfies Prisma.ProductInclude;

export type StoreProductRow = Prisma.ProductGetPayload<{
  include: typeof storeProductInclude;
}>;

function imageOf(
  media: MediaService,
  image: { media: Parameters<MediaService["toDto"]>[0]; alt: string | null },
): StoreImage {
  return { media: media.toDto(image.media), alt: image.alt ?? "" };
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((cell) => String(cell ?? "")) : [];
}

function byOrder<T extends { sortOrder: number; name: string }>(a: T, b: T) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

/** Unique values by id/name, in sort order. */
function uniqueSorted<T extends { sortOrder: number; name: string }>(
  items: T[],
  key: (item: T) => string,
): T[] {
  const seen = new Map<string, T>();
  for (const item of items) if (!seen.has(key(item))) seen.set(key(item), item);
  return [...seen.values()].sort(byOrder);
}

export function toStoreProductSummary(
  row: StoreSummaryRow,
  media: MediaService,
): StoreProductSummary {
  const { price, compareAt } = currentPrice(row);
  const [first, second] = row.images;
  return {
    slug: row.slug,
    name: row.name,
    category: { slug: row.category.slug, name: row.category.name },
    price,
    compareAt,
    image: first ? imageOf(media, first) : null,
    hoverImage: second ? imageOf(media, second) : null,
    colors: uniqueSorted(
      row.variants.map((v) => v.color),
      (c) => c.name,
    ).map((c) => ({ name: c.name, hex: c.hex })),
    stockStatus: row.variants.some((v) => v.stock > 0)
      ? "in_stock"
      : "out_of_stock",
  };
}

export function toStoreProduct(
  row: StoreProductRow,
  media: MediaService,
  now: Date = new Date(),
  /** Settings → Stock "max quantity per variant per order" (PRD §5.6 rule 4). */
  maxQtyPerVariant: number = DEFAULT_MAX_QTY_PER_VARIANT,
): StoreProduct {
  const { price, compareAt } = currentPrice(row, now);
  const saleOn = isSaleActive(row, now);
  return {
    slug: row.slug,
    name: row.name,
    shortDesc: row.shortDesc,
    description: row.description,
    fabric: row.fabric,
    gsm: row.gsm,
    care: row.care,
    category: { slug: row.category.slug, name: row.category.name },
    price,
    compareAt,
    saleEndsAt: saleOn && row.saleEnd ? row.saleEnd.toISOString() : null,
    images: row.images.map((image) => ({
      ...imageOf(media, image),
      colorId: image.colorId,
    })),
    colors: uniqueSorted(
      row.variants.map((v) => v.color),
      (c) => c.id,
    ).map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
    sizes: uniqueSorted(
      row.variants.map((v) => v.size),
      (s) => s.id,
    ).map((s) => ({ id: s.id, name: s.name })),
    variants: row.variants.map((v) => ({
      id: v.id,
      sizeId: v.sizeId,
      colorId: v.colorId,
      ...variantPrice(row, v, now),
    })),
    sizeChart: row.sizeChart
      ? {
          columns: strings(row.sizeChart.columns),
          rows: Array.isArray(row.sizeChart.rows)
            ? row.sizeChart.rows.map(strings)
            : [],
        }
      : null,
    maxQtyPerVariant,
    seo: { title: row.seoTitle, description: row.seoDesc },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toStoreProductStock(
  row: {
    lowStockThreshold: number | null;
    variants: Array<{ id: string; stock: number }>;
  },
  /** Settings → Stock threshold, used when the product has none. */
  storeThreshold?: number,
): StoreProductStock {
  const threshold = thresholdOf(row, storeThreshold);
  return {
    variants: row.variants.map((v) => ({
      id: v.id,
      stockStatus: stockStatusFor(v.stock, threshold),
    })),
  };
}
