import { z } from "zod";
import { imageSchema } from "./content.js";

// Catalog reference data edited in the dashboard (PRD §6.2, §6.3, §6.7):
// categories, collections, sizes, colours. Request schemas only; the web keeps
// its response schemas in apps/web/lib/<module>/.

/** URL slug: lowercase letters, digits and single hyphens. */
export const SLUG_MAX_LENGTH = 80;
export const slugSchema = z
  .string()
  .trim()
  .min(1, { message: "REQUIRED" })
  .max(SLUG_MAX_LENGTH, { message: "TOO_LONG" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "INVALID_SLUG" });

/**
 * "Eid Collection '26" → "eid-collection-26". Letters outside a–z (e.g.
 * Bangla) are dropped, so the result can be empty; callers fall back to a
 * default then.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
}

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "REQUIRED" })
  .max(60, { message: "TOO_LONG" });

const descriptionSchema = z
  .string()
  .trim()
  .max(500, { message: "TOO_LONG" })
  .nullable()
  // An emptied textarea means "no description".
  .transform((v) => (v ? v : null));

const sortOrderSchema = z.number().int().min(0).max(9999);

// ── Categories and collections (PRD §6.3) ──────────────────────────────────
// Each resource has a create schema (with defaults) and an update schema
// built from the same fields WITHOUT defaults: in Zod 4 a default still fills
// in inside `.partial()`, which would silently reset fields on PATCH.

const categoryFields = {
  name: nameSchema,
  /** Optional on create: the API generates a unique one from the name. */
  slug: slugSchema,
  description: descriptionSchema,
  image: imageSchema.nullable(),
  sortOrder: sortOrderSchema,
  showOnHome: z.boolean(),
};

export const categoryInputSchema = z.strictObject({
  ...categoryFields,
  slug: categoryFields.slug.optional(),
  description: categoryFields.description.default(null),
  image: categoryFields.image.default(null),
  sortOrder: categoryFields.sortOrder.default(0),
  showOnHome: categoryFields.showOnHome.default(false),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const categoryUpdateSchema = z.strictObject(categoryFields).partial();
export type CategoryUpdate = z.input<typeof categoryUpdateSchema>;

const collectionFields = {
  ...categoryFields,
  /** Hidden collections keep their products but disappear from the store. */
  isActive: z.boolean(),
};

export const collectionInputSchema = categoryInputSchema.extend({
  isActive: collectionFields.isActive.default(true),
});
export type CollectionInput = z.input<typeof collectionInputSchema>;

export const collectionUpdateSchema = z
  .strictObject(collectionFields)
  .partial();
export type CollectionUpdate = z.input<typeof collectionUpdateSchema>;

// ── Sizes and colours (PRD §6.7) ───────────────────────────────────────────

const sizeFields = {
  /** "M", "XL", or a panjabi chest size such as "40". */
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(12, { message: "TOO_LONG" }),
  sortOrder: sortOrderSchema,
};

export const sizeInputSchema = z.strictObject({
  ...sizeFields,
  sortOrder: sizeFields.sortOrder.default(0),
});
export type SizeInput = z.input<typeof sizeInputSchema>;
export const sizeUpdateSchema = z.strictObject(sizeFields).partial();
export type SizeUpdate = z.input<typeof sizeUpdateSchema>;

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: "INVALID_HEX" })
  .transform((v) => v.toUpperCase());

const colorFields = {
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(30, { message: "TOO_LONG" }),
  hex: hexColorSchema,
  sortOrder: sortOrderSchema,
};

export const colorInputSchema = z.strictObject({
  ...colorFields,
  sortOrder: colorFields.sortOrder.default(0),
});
export type ColorInput = z.input<typeof colorInputSchema>;
export const colorUpdateSchema = z.strictObject(colorFields).partial();
export type ColorUpdate = z.input<typeof colorUpdateSchema>;

/** Paged list query shared by the catalog admin lists. */
export const catalogListQuerySchema = z.strictObject({
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});
/** What a caller sends (query strings are coerced by the schema). */
export type CatalogListQuery = { q?: string; page?: number; limit?: number };
