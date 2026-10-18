import { z } from "zod";
import { sizeChartTableSchema, slugSchema } from "./catalog.js";

// Products and variants edited in the dashboard (PRD §6.2). Request schemas
// and pure helpers; the web keeps its response schemas in lib/product/.

export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const PRODUCT_MAX_IMAGES = 12;
export const PRODUCT_MAX_TAGS = 20;
export const PRODUCT_MAX_COLLECTIONS = 20;
/** Whole taka. */
export const PRICE_MAX = 1_000_000;
export const STOCK_MAX = 99_999;

/** Whole taka, never a fraction (rules.md golden rule 4). */
export const priceSchema = z
  .number({ message: "REQUIRED" })
  .int({ message: "WHOLE_TAKA" })
  .min(1, { message: "TOO_SMALL" })
  .max(PRICE_MAX, { message: "TOO_BIG" });

export const stockSchema = z
  .number({ message: "REQUIRED" })
  .int({ message: "INVALID" })
  .min(0, { message: "TOO_SMALL" })
  .max(STOCK_MAX, { message: "TOO_BIG" });

/** Optional text: an emptied field means null. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, { message: "TOO_LONG" })
    .nullable()
    .transform((v) => (v ? v : null));
}

const idSchema = z.string().trim().min(1, { message: "REQUIRED" });

/** Removes repeats, comparing case-insensitively; keeps the first spelling. */
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const productImageInputSchema = z.strictObject({
  mediaId: idSchema,
  /** Every image has alt text (PRD §6.7 rule 3). */
  alt: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(160, { message: "TOO_LONG" }),
  /** Set when the photo shows one colour: the PDP switches gallery by colour. */
  colorId: idSchema.nullable().default(null),
});
export type ProductImageInput = z.input<typeof productImageInputSchema>;

export const productSizeChartInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("template"), sizeChartId: idSchema }),
  z.strictObject({ kind: z.literal("custom"), table: sizeChartTableSchema }),
]);
export type ProductSizeChartInput = z.input<typeof productSizeChartInputSchema>;

const productFields = {
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(120, { message: "TOO_LONG" }),
  /** Optional on create: the API generates a unique one from the name. */
  slug: slugSchema,
  shortDesc: optionalText(300),
  /** Markdown-lite (`@aaarchive/shared/rich-text`), never HTML. */
  description: optionalText(10_000),
  fabric: optionalText(120),
  gsm: z
    .number()
    .int({ message: "INVALID" })
    .min(50, { message: "TOO_SMALL" })
    .max(1000, { message: "TOO_BIG" })
    .nullable(),
  care: optionalText(1000),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, { message: "REQUIRED" })
        .max(30, { message: "TOO_LONG" }),
    )
    .max(PRODUCT_MAX_TAGS, { message: "TOO_MANY" })
    .transform((tags) => uniqueBy(tags, (t) => t)),
  categoryId: idSchema,
  collectionIds: z
    .array(idSchema)
    .max(PRODUCT_MAX_COLLECTIONS, { message: "TOO_MANY" })
    .transform((ids) => [...new Set(ids)]),
  basePrice: priceSchema,
  salePrice: priceSchema.nullable(),
  saleStart: z.iso.datetime({ offset: true, message: "INVALID" }).nullable(),
  saleEnd: z.iso.datetime({ offset: true, message: "INVALID" }).nullable(),
  /** Overrides the store's low-stock threshold for this product. */
  lowStockThreshold: z
    .number()
    .int({ message: "INVALID" })
    .min(0, { message: "TOO_SMALL" })
    .max(999, { message: "TOO_BIG" })
    .nullable(),
  sizeChart: productSizeChartInputSchema,
  /** In gallery order; the first one is the main image. */
  images: z
    .array(productImageInputSchema)
    .max(PRODUCT_MAX_IMAGES, { message: "TOO_MANY" })
    .transform((images) => uniqueBy(images, (i) => i.mediaId)),
  status: productStatusSchema,
  isFeatured: z.boolean(),
  seoTitle: optionalText(70),
  seoDesc: optionalText(160),
};

export type ProductPricing = {
  basePrice: number;
  salePrice: number | null;
  saleStart: string | Date | null;
  saleEnd: string | Date | null;
};

/**
 * Cross-field price rules. Returns `[field, code]` pairs, empty when fine.
 * The API re-runs this on the merged record for partial updates.
 */
export function pricingIssues(
  p: ProductPricing,
): Array<[keyof ProductPricing, string]> {
  const issues: Array<[keyof ProductPricing, string]> = [];
  if (p.salePrice != null && p.salePrice >= p.basePrice) {
    issues.push(["salePrice", "SALE_NOT_BELOW_BASE"]);
  }
  if ((p.saleStart || p.saleEnd) && p.salePrice == null) {
    issues.push(["salePrice", "SALE_PRICE_REQUIRED"]);
  }
  if (
    p.saleStart &&
    p.saleEnd &&
    new Date(p.saleEnd).getTime() <= new Date(p.saleStart).getTime()
  ) {
    issues.push(["saleEnd", "SALE_END_BEFORE_START"]);
  }
  return issues;
}

export const productInputSchema = z
  .strictObject({
    ...productFields,
    slug: productFields.slug.optional(),
    shortDesc: productFields.shortDesc.default(null),
    description: productFields.description.default(null),
    fabric: productFields.fabric.default(null),
    gsm: productFields.gsm.default(null),
    care: productFields.care.default(null),
    tags: productFields.tags.default([]),
    collectionIds: productFields.collectionIds.default([]),
    salePrice: productFields.salePrice.default(null),
    saleStart: productFields.saleStart.default(null),
    saleEnd: productFields.saleEnd.default(null),
    lowStockThreshold: productFields.lowStockThreshold.default(null),
    sizeChart: productFields.sizeChart.default({ kind: "none" }),
    images: productFields.images.default([]),
    status: productFields.status.default("DRAFT"),
    isFeatured: productFields.isFeatured.default(false),
    seoTitle: productFields.seoTitle.default(null),
    seoDesc: productFields.seoDesc.default(null),
  })
  .superRefine((p, ctx) => {
    for (const [field, code] of pricingIssues(p)) {
      ctx.addIssue({ code: "custom", message: code, path: [field] });
    }
  });
export type ProductInput = z.input<typeof productInputSchema>;
export type ProductValues = z.output<typeof productInputSchema>;

/** No defaults (Zod 4 fills defaults inside `.partial()`). Lists replace whole. */
export const productUpdateSchema = z.strictObject(productFields).partial();
export type ProductUpdate = z.input<typeof productUpdateSchema>;

/** True while the sale price applies: inside [saleStart, saleEnd) when set. */
export function isSaleActive(p: ProductPricing, now: Date = new Date()) {
  if (p.salePrice == null || p.salePrice >= p.basePrice) return false;
  const t = now.getTime();
  if (p.saleStart && t < new Date(p.saleStart).getTime()) return false;
  if (p.saleEnd && t >= new Date(p.saleEnd).getTime()) return false;
  return true;
}

/** What a customer pays now, and the crossed-out price during a sale. */
export function currentPrice(p: ProductPricing, now: Date = new Date()) {
  return isSaleActive(p, now)
    ? { price: p.salePrice as number, compareAt: p.basePrice }
    : { price: p.basePrice, compareAt: null };
}

// ── Variants ───────────────────────────────────────────────────────────────

export const SKU_MAX_LENGTH = 40;
export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/, { message: "INVALID_SKU" })
  .max(SKU_MAX_LENGTH, { message: "TOO_LONG" });

function skuPart(value: string, max: number): string {
  return value
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/**
 * "classic-hoodie", "XL", "Charcoal Black" → "CLASSIC-HOODIE-XL-CHA". The API
 * appends "-2", "-3"… when the SKU is taken.
 */
export function skuFor(slug: string, size: string, color: string): string {
  const parts = [
    skuPart(slug, 22) || "AAR",
    skuPart(size, 6) || "S",
    skuPart(color.replace(/\s+/g, ""), 3) || "C",
  ];
  return parts.join("-").slice(0, SKU_MAX_LENGTH);
}

/** Size × colour pairs that `existing` does not have yet, in the given order. */
export function missingVariantPairs(
  sizeIds: readonly string[],
  colorIds: readonly string[],
  existing: ReadonlyArray<{ sizeId: string; colorId: string }>,
): Array<{ sizeId: string; colorId: string }> {
  const have = new Set(existing.map((v) => `${v.sizeId}|${v.colorId}`));
  const pairs: Array<{ sizeId: string; colorId: string }> = [];
  for (const colorId of new Set(colorIds)) {
    for (const sizeId of new Set(sizeIds)) {
      if (!have.has(`${sizeId}|${colorId}`)) pairs.push({ sizeId, colorId });
    }
  }
  return pairs;
}

export const variantGenerateSchema = z.strictObject({
  sizeIds: z.array(idSchema).min(1, { message: "REQUIRED" }).max(30),
  colorIds: z.array(idSchema).min(1, { message: "REQUIRED" }).max(30),
  /** Starting stock for each new variant. */
  stock: stockSchema.default(0),
});
export type VariantGenerateInput = z.input<typeof variantGenerateSchema>;

export const variantUpdateSchema = z.strictObject({
  id: idSchema,
  sku: skuSchema.optional(),
  stock: stockSchema.optional(),
  /**
   * The stock the editor last saw. When it no longer matches (an order took
   * stock meanwhile) the API refuses with STOCK_CHANGED instead of
   * overwriting it.
   */
  expectedStock: z.number().int().optional(),
  priceOverride: priceSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

/** Quick stock edit: several variants of one product in one transaction. */
export const variantBulkUpdateSchema = z.strictObject({
  variants: z
    .array(variantUpdateSchema)
    .min(1)
    .max(400)
    .refine((list) => new Set(list.map((v) => v.id)).size === list.length, {
      message: "DUPLICATE",
    }),
});
export type VariantBulkUpdate = z.input<typeof variantBulkUpdateSchema>;

// ── Admin list ─────────────────────────────────────────────────────────────

export const PRODUCT_SORTS = [
  "updated",
  "newest",
  "name",
  "stock_asc",
  "stock_desc",
] as const;
export const PRODUCT_STOCK_FILTERS = ["low", "out"] as const;

export const adminProductListQuerySchema = z.strictObject({
  /** Name, slug or a variant SKU. */
  q: z.string().trim().max(80).optional(),
  categoryId: z.string().trim().min(1).optional(),
  status: productStatusSchema.optional(),
  /** low: an active variant at or under the threshold; out: one at 0. */
  stock: z.enum(PRODUCT_STOCK_FILTERS).optional(),
  sort: z.enum(PRODUCT_SORTS).default("updated"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
/** What a caller sends (query strings are coerced by the schema). */
export type AdminProductListQuery = {
  q?: string;
  categoryId?: string;
  status?: ProductStatus;
  stock?: (typeof PRODUCT_STOCK_FILTERS)[number];
  sort?: (typeof PRODUCT_SORTS)[number];
  page?: number;
  limit?: number;
};
