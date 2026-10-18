import { collectionInputSchema } from "@aaarchive/shared/catalog";
import { z } from "zod";
import { pagedSchema } from "@/lib/api/paged";
import {
  imageRefSchema,
  optionalSlugFieldSchema,
} from "@/lib/category/category-schemas";

export const adminCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image: imageRefSchema.nullable(),
  sortOrder: z.number().int(),
  showOnHome: z.boolean(),
  isActive: z.boolean(),
  productCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminCollection = z.infer<typeof adminCollectionSchema>;

export const collectionPageSchema = pagedSchema(adminCollectionSchema);

/** Dashboard form: the API's create schema with a blank-able slug field. */
export const collectionFormSchema = collectionInputSchema.extend({
  slug: optionalSlugFieldSchema,
});
export type CollectionFormInput = z.input<typeof collectionFormSchema>;
export type CollectionFormValues = z.output<typeof collectionFormSchema>;
