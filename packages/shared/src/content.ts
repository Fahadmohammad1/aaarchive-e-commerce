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

// ── Tables edited in Content (PRD §6.7) ─────────────────────────────────

export const SOCIAL_POST_PLATFORMS = [
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
] as const;

/** A post in "Follow our style journey" (PRD H6): photo uploaded, no social API. */
export const socialPostInputSchema = z.strictObject({
  image: imageSchema,
  /** e.g. "12K+ likes". */
  label: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(30, { message: "TOO_LONG" }),
  platform: z.enum(SOCIAL_POST_PLATFORMS),
  link: z
    .string()
    .trim()
    .regex(/^https:\/\/\S+$/, { message: "INVALID_HREF" })
    .max(500, { message: "TOO_LONG" }),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});
export type SocialPostInput = z.input<typeof socialPostInputSchema>;

/** Markdown-lite body (`@aaarchive/shared/rich-text`), never HTML. */
const richTextBody = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(max, { message: "TOO_LONG" });

const optionalSeo = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: "TOO_LONG" })
    .nullable()
    .transform((v) => (v ? v : null));

/**
 * Content pages: /about, /contact, /size-guide, /policies/<slug>
 * (PRD §5.11). The slug decides the address.
 */
export const PAGE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const pageInputSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(60, { message: "TOO_LONG" })
    .regex(PAGE_SLUG_REGEX, { message: "INVALID_SLUG" }),
  title: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(80, { message: "TOO_LONG" }),
  content: richTextBody(20_000),
  seoTitle: optionalSeo(70),
  seoDesc: optionalSeo(160),
});
export type PageInput = z.input<typeof pageInputSchema>;

/** Pages with a fixed address in the storefront; any other slug is a policy. */
export const FIXED_PAGE_SLUGS = ["about", "contact", "size-guide"] as const;

/** Where a page lives on the storefront. */
export function pagePath(slug: string): string {
  return (FIXED_PAGE_SLUGS as readonly string[]).includes(slug)
    ? `/${slug}`
    : `/policies/${slug}`;
}

export const faqInputSchema = z.strictObject({
  question: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(200, { message: "TOO_LONG" }),
  answer: richTextBody(4_000),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});
export type FaqInput = z.input<typeof faqInputSchema>;

/** The contact form (PRD §5.11): goes to the store's email. */
export const contactMessageSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, { message: "TOO_SHORT" })
    .max(60, { message: "TOO_LONG" }),
  /** Phone or email, so the team can answer. */
  contact: z
    .string()
    .trim()
    .min(5, { message: "TOO_SHORT" })
    .max(100, { message: "TOO_LONG" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "TOO_SHORT" })
    .max(2000, { message: "TOO_LONG" }),
  turnstileToken: z.string().max(4096).optional(),
});
export type ContactMessageInput = z.input<typeof contactMessageSchema>;
