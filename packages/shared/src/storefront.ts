import { z } from "zod";
import { isSaleActive, type ProductPricing } from "./product.js";

// Public catalog (PRD §5.3–5.5): query schemas both apps use, and the price
// rule checkout must share. Never carries a stock number (PRD §5.6).

export const STORE_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "best_selling",
] as const;
export type StoreSort = (typeof STORE_SORTS)[number];

export const STORE_PAGE_SIZE = 12;

/** `size=M&size=L` and `?size=M` both arrive; normalise to a list. */
const listParam = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .pipe(z.array(z.string().trim().min(1).max(30)).max(20));

const priceParam = z.coerce.number().int().min(0).max(1_000_000);

export const storeProductListQuerySchema = z.strictObject({
  /** Category slug. */
  category: z.string().trim().min(1).max(80).optional(),
  /** Collection slug. */
  collection: z.string().trim().min(1).max(80).optional(),
  /** Size names, e.g. M or 40. */
  size: listParam.optional(),
  /** Colour names, e.g. Black. */
  color: listParam.optional(),
  minPrice: priceParam.optional(),
  maxPrice: priceParam.optional(),
  /** "1": only products with at least one variant in stock. */
  inStock: z
    .enum(["1", "true"])
    .transform(() => true)
    .optional(),
  sort: z.enum(STORE_SORTS).default("newest"),
  page: z.coerce.number().int().min(1).max(200).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(STORE_PAGE_SIZE),
  /** Leave one product out (the PDP's related products). */
  exclude: z.string().trim().min(1).max(80).optional(),
});

/** What a caller sends (query strings are coerced by the schema). */
export type StoreProductListQuery = {
  category?: string;
  collection?: string;
  size?: string[];
  color?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: StoreSort;
  page?: number;
  limit?: number;
  exclude?: string;
};

export const storeSearchQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(24).default(STORE_PAGE_SIZE),
  page: z.coerce.number().int().min(1).max(50).default(1),
});

/**
 * What one variant costs now (user decision 2026-10-19): during the
 * product's sale every variant sells at the sale price; otherwise a variant's
 * own price, else the product price. `compareAt` is the crossed-out price.
 */
export function variantPrice(
  product: ProductPricing,
  variant: { priceOverride: number | null },
  now: Date = new Date(),
): { price: number; compareAt: number | null } {
  const regular = variant.priceOverride ?? product.basePrice;
  if (isSaleActive(product, now) && product.salePrice != null) {
    return {
      price: product.salePrice,
      compareAt: regular > product.salePrice ? regular : null,
    };
  }
  return { price: regular, compareAt: null };
}
