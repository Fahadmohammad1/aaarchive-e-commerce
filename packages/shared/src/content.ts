import { z } from "zod";

// Editable storefront content (PRD §6.7). One ContentBlock row per key; the
// admin forms and the API validate with these same schemas, so a section can
// never be saved in a state the storefront cannot render.
//
// These are the STORED shapes. References to the catalog (products in the look
// file, categories in tabs) are ids/slugs; the API resolves them for the
// storefront.

// ── Building blocks ─────────────────────────────────────────────────────

/** Two-line uppercase headings ("The archive" / "index"). */
const headingSchema = z.array(z.string().trim().min(1).max(60)).min(1).max(3);

const shortTextSchema = z.string().trim().max(240);

/** Internal path ("/shop?audience=men") or absolute https URL. */
export const hrefSchema = z
  .string()
  .trim()
  .refine((v) => v.startsWith("/") || /^https:\/\/\S+$/.test(v), {
    message: "INVALID_HREF",
  });

export const linkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: hrefSchema,
});

/**
 * An image from the media library (MediaAsset in Supabase Storage). Stored as
 * a reference; the API resolves it to URLs and sizes. Alt text is required
 * (PRD §9.4).
 */
export const imageSchema = z.object({
  mediaId: z.string().min(1),
  alt: z.string().trim().min(1).max(160),
});

/** Position on an image, in percent from the top-left corner. */
const hotspotSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const SOCIAL_LINK_PLATFORMS = [
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "WHATSAPP",
  "MESSENGER",
  "YOUTUBE",
] as const;

/** Icons the "Made to be kept" promises can use (mapped to Lucide in the web). */
export const PROMISE_ICONS = [
  "weather",
  "fabric",
  "payment",
  "exchange",
  "delivery",
  "quality",
  "comfort",
  "gift",
] as const;

// ── Site-wide blocks ────────────────────────────────────────────────────

export const announcementSchema = z.object({
  enabled: z.boolean(),
  text: z.string().trim().max(120),
});

export const navigationSchema = z.object({
  /** Full-screen menu links. */
  menu: z.array(linkSchema).min(1).max(10),
  /** The cream link bar in the footer. */
  footer: z.array(linkSchema).max(10),
});

export const footerSchema = z.object({
  blurb: shortTextSchema,
  image: imageSchema.nullable(),
  socials: z
    .array(
      z.object({ platform: z.enum(SOCIAL_LINK_PLATFORMS), href: hrefSchema }),
    )
    .max(6),
  policyLinks: z.array(linkSchema).max(6),
});

// ── Home page sections (design.md §6) ───────────────────────────────────

export const heroSchema = z.object({
  headline: headingSchema,
  audiences: z.array(linkSchema).max(4),
  mainImage: imageSchema,
  sideImages: z.array(imageSchema).max(2),
});

/** The categories themselves come from the catalog (showOnHome + sortOrder). */
export const homeCategoriesSchema = z.object({
  heading: headingSchema,
  intro: shortTextSchema,
});

export const lookFileSchema = z.object({
  heading: headingSchema,
  /** Tag on the image, e.g. "Filed under: Winter". */
  label: z.string().trim().max(40),
  intro: shortTextSchema,
  image: imageSchema,
  /** Shop-the-look link for the CTA. */
  href: hrefSchema,
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        /** Catalogue code shown on the card; defaults to the product's SKU prefix. */
        code: z.string().trim().max(20).optional(),
        hotspot: hotspotSchema,
      }),
    )
    .min(1)
    .max(6),
});

export const latestEntriesSchema = z.object({
  heading: headingSchema,
  intro: shortTextSchema,
  /** Filter chips: "new" (latest products) or a category slug. */
  tabs: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(24),
        value: z.union([z.literal("new"), z.string().regex(/^[a-z0-9-]+$/)]),
      }),
    )
    .min(1)
    .max(8),
  campaign: z.object({
    tag: z.string().trim().max(24),
    title: headingSchema,
    text: shortTextSchema,
    image: imageSchema,
    href: hrefSchema,
  }),
});

export const promisesSchema = z.object({
  heading: headingSchema,
  intro: shortTextSchema,
  image: imageSchema,
  items: z
    .array(
      z.object({
        icon: z.enum(PROMISE_ICONS),
        title: z.string().trim().min(1).max(40),
        text: z.string().trim().min(1).max(140),
      }),
    )
    .min(2)
    .max(6),
});

export const homeSocialSchema = z.object({
  heading: headingSchema,
  intro: shortTextSchema,
  followHref: hrefSchema,
});

// ── Registry ────────────────────────────────────────────────────────────

export const contentSchemas = {
  "site.announcement": announcementSchema,
  "site.navigation": navigationSchema,
  "site.footer": footerSchema,
  "home.hero": heroSchema,
  "home.categories": homeCategoriesSchema,
  "home.lookFile": lookFileSchema,
  "home.latest": latestEntriesSchema,
  "home.promises": promisesSchema,
  "home.social": homeSocialSchema,
} as const;

export type ContentKey = keyof typeof contentSchemas;
export type ContentData<K extends ContentKey> = z.infer<
  (typeof contentSchemas)[K]
>;

export const CONTENT_KEYS = Object.keys(contentSchemas) as ContentKey[];

export function isContentKey(value: string): value is ContentKey {
  return value in contentSchemas;
}
