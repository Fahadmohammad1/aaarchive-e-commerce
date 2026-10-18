import { mediaAssetSchema } from "@aaarchive/shared/media";
import { productStatusSchema } from "@aaarchive/shared/product";
import { stockStatusSchema } from "@aaarchive/shared/stock";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

// Admin responses only: these carry stock numbers and must never be used by
// storefront code (PRD §5.6).

export const adminVariantSchema = z.object({
  id: z.string(),
  sizeId: z.string(),
  sizeName: z.string(),
  colorId: z.string(),
  colorName: z.string(),
  colorHex: z.string(),
  sku: z.string(),
  stock: z.number().int(),
  stockStatus: stockStatusSchema,
  priceOverride: z.number().int().nullable(),
  isActive: z.boolean(),
  hasOrders: z.boolean(),
});
export type AdminVariant = z.infer<typeof adminVariantSchema>;

const ref = z.object({ id: z.string(), name: z.string(), slug: z.string() });

export const adminProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  shortDesc: z.string().nullable(),
  description: z.string().nullable(),
  fabric: z.string().nullable(),
  gsm: z.number().int().nullable(),
  care: z.string().nullable(),
  tags: z.array(z.string()),
  category: ref,
  collections: z.array(ref),
  basePrice: z.number().int(),
  salePrice: z.number().int().nullable(),
  saleStart: z.string().nullable(),
  saleEnd: z.string().nullable(),
  saleActive: z.boolean(),
  lowStockThreshold: z.number().int().nullable(),
  sizeChart: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }),
    z.object({
      kind: z.literal("template"),
      sizeChartId: z.string(),
      name: z.string(),
    }),
    z.object({
      kind: z.literal("custom"),
      table: z.object({
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
      }),
    }),
  ]),
  images: z.array(
    z.object({
      id: z.string(),
      mediaId: z.string(),
      alt: z.string(),
      colorId: z.string().nullable(),
      media: mediaAssetSchema,
    }),
  ),
  variants: z.array(adminVariantSchema),
  status: productStatusSchema,
  isFeatured: z.boolean(),
  seoTitle: z.string().nullable(),
  seoDesc: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const adminProductListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: productStatusSchema,
  isFeatured: z.boolean(),
  category: z.object({ id: z.string(), name: z.string() }),
  basePrice: z.number().int(),
  salePrice: z.number().int().nullable(),
  saleActive: z.boolean(),
  image: mediaAssetSchema.nullable(),
  variantCount: z.number().int(),
  totalStock: z.number().int(),
  lowStockCount: z.number().int(),
  outOfStockCount: z.number().int(),
  updatedAt: z.string(),
});
export type AdminProductListItem = z.infer<typeof adminProductListItemSchema>;

export const productPageSchema = pagedSchema(adminProductListItemSchema);
