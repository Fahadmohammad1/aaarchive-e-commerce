import {
  SOCIAL_LINK_PLATFORMS,
  SOCIAL_POST_PLATFORMS,
} from "@aaarchive/shared/content";
import { z } from "zod";
import { storeGroupSchema } from "@/lib/collection/collection-store-api";
import {
  storeImageSchema,
  storeProductSummarySchema,
} from "@/lib/product/product-store-schemas";

// Public content responses (apps/api content.service.ts). Server fetchers
// validate with these; sections not set up yet are null and left out.

const link = z.object({ label: z.string(), href: z.string() });
const heading = z.array(z.string());

export const homeContentSchema = z.object({
  hero: z
    .object({
      headline: heading,
      audiences: z.array(link),
      mainImage: storeImageSchema,
      sideImages: z.array(storeImageSchema),
    })
    .nullable(),
  categories: z
    .object({ heading, intro: z.string(), items: z.array(storeGroupSchema) })
    .nullable(),
  lookFile: z
    .object({
      heading,
      label: z.string(),
      intro: z.string(),
      image: storeImageSchema,
      href: z.string(),
      items: z.array(
        z.object({
          code: z.string().nullable(),
          hotspot: z.object({ x: z.number(), y: z.number() }),
          product: storeProductSummarySchema,
        }),
      ),
    })
    .nullable(),
  latest: z
    .object({
      heading,
      intro: z.string(),
      tabs: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
          products: z.array(storeProductSummarySchema),
        }),
      ),
      campaign: z.object({
        tag: z.string(),
        title: heading,
        text: z.string(),
        image: storeImageSchema,
        href: z.string(),
      }),
    })
    .nullable(),
  promises: z
    .object({
      heading,
      intro: z.string(),
      image: storeImageSchema,
      items: z.array(
        z.object({ icon: z.string(), title: z.string(), text: z.string() }),
      ),
    })
    .nullable(),
  social: z
    .object({
      heading,
      intro: z.string(),
      followHref: z.string(),
      posts: z.array(
        z.object({
          id: z.string(),
          image: storeImageSchema,
          label: z.string(),
          platform: z.enum(SOCIAL_POST_PLATFORMS),
          link: z.string(),
        }),
      ),
    })
    .nullable(),
});
export type HomeContent = z.infer<typeof homeContentSchema>;

export const siteContentSchema = z.object({
  announcement: z.string().nullable(),
  navigation: z
    .object({ menu: z.array(link), footer: z.array(link) })
    .nullable(),
  footer: z
    .object({
      blurb: z.string(),
      image: storeImageSchema.nullable(),
      socials: z.array(
        z.object({ platform: z.enum(SOCIAL_LINK_PLATFORMS), href: z.string() }),
      ),
      policyLinks: z.array(link),
    })
    .nullable(),
});
export type SiteContent = z.infer<typeof siteContentSchema>;

export const publicPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  seoTitle: z.string().nullable(),
  seoDesc: z.string().nullable(),
  updatedAt: z.string(),
});
export type PublicPage = z.infer<typeof publicPageSchema>;

export const faqListSchema = z.array(
  z.object({ id: z.string(), question: z.string(), answer: z.string() }),
);

export const publicSettingsSchema = z.object({
  store: z.object({
    name: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    messenger: z.string(),
    email: z.string(),
    address: z.string(),
    logo: storeImageSchema.nullable(),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    ogImage: storeImageSchema.nullable(),
  }),
  tracking: z.object({
    ga4Id: z.string(),
    metaPixelId: z.string(),
    clarityId: z.string(),
  }),
});
export type StorePublicSettings = z.infer<typeof publicSettingsSchema>;

const sitemapRow = z.object({ slug: z.string(), updatedAt: z.string() });
export const sitemapSchema = z.object({
  products: z.array(sitemapRow),
  categories: z.array(sitemapRow),
  collections: z.array(sitemapRow),
  pages: z.array(sitemapRow),
});
