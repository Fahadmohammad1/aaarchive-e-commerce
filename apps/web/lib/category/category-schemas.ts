import { categoryInputSchema, slugSchema } from "@aaarchive/shared/catalog";
import { mediaAssetSchema } from "@aaarchive/shared/media";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";

/** `{ mediaId, alt, media }` — a stored image reference resolved by the API. */
export const imageRefSchema = z.object({
  mediaId: z.string(),
  alt: z.string(),
  media: mediaAssetSchema,
});
export type ImageRef = z.infer<typeof imageRefSchema>;

export const adminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image: imageRefSchema.nullable(),
  sortOrder: z.number().int(),
  showOnHome: z.boolean(),
  productCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const categoryPageSchema = pagedSchema(adminCategorySchema);

/** An empty slug field means "generate it from the name". */
export const optionalSlugFieldSchema = z
  .union([z.literal(""), slugSchema])
  .optional()
  .transform((v) => (v ? v : undefined));

/** Dashboard form: the API's create schema with a blank-able slug field. */
export const categoryFormSchema = categoryInputSchema.extend({
  slug: optionalSlugFieldSchema,
});
export type CategoryFormInput = z.input<typeof categoryFormSchema>;
export type CategoryFormValues = z.output<typeof categoryFormSchema>;
