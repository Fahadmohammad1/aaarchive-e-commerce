import { mediaAssetSchema } from "@aaarchive/shared/media";
import { stockStatusSchema } from "@aaarchive/shared/stock";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

// Public catalog responses (PRD §5.3–5.6). `.strip()` (Zod's default) drops
// anything the API might add by mistake, so an unexpected field can never
// reach props or hydration data.

export const storeImageSchema = z.object({
  media: mediaAssetSchema,
  alt: z.string(),
});
export type StoreImage = z.infer<typeof storeImageSchema>;

export const storeProductSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.object({ slug: z.string(), name: z.string() }),
  price: z.number().int(),
  compareAt: z.number().int().nullable(),
  image: storeImageSchema.nullable(),
  hoverImage: storeImageSchema.nullable(),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })),
  stockStatus: z.enum(["in_stock", "out_of_stock"]),
});
export type StoreProductSummary = z.infer<typeof storeProductSummarySchema>;

export const storeProductPageSchema = pagedSchema(storeProductSummarySchema);
export type StoreProductPage = z.infer<typeof storeProductPageSchema>;

export const storeProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  shortDesc: z.string().nullable(),
  description: z.string().nullable(),
  fabric: z.string().nullable(),
  gsm: z.number().int().nullable(),
  care: z.string().nullable(),
  category: z.object({ slug: z.string(), name: z.string() }),
  price: z.number().int(),
  compareAt: z.number().int().nullable(),
  saleEndsAt: z.string().nullable(),
  images: z.array(storeImageSchema.extend({ colorId: z.string().nullable() })),
  colors: z.array(
    z.object({ id: z.string(), name: z.string(), hex: z.string() }),
  ),
  sizes: z.array(z.object({ id: z.string(), name: z.string() })),
  variants: z.array(
    z.object({
      id: z.string(),
      sizeId: z.string(),
      colorId: z.string(),
      price: z.number().int(),
      compareAt: z.number().int().nullable(),
    }),
  ),
  sizeChart: z
    .object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .nullable(),
  maxQtyPerVariant: z.number().int(),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
  }),
  updatedAt: z.string(),
});
export type StoreProduct = z.infer<typeof storeProductSchema>;

export const storeProductStockSchema = z.object({
  variants: z.array(
    z.object({ id: z.string(), stockStatus: stockStatusSchema }),
  ),
});
export type StoreProductStock = z.infer<typeof storeProductStockSchema>;

export const storeFiltersSchema = z.object({
  sizes: z.array(z.string()),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })),
  price: z.object({ min: z.number().int(), max: z.number().int() }),
});
export type StoreFilters = z.infer<typeof storeFiltersSchema>;
