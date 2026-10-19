import { CONTENT_KEYS, SOCIAL_POST_PLATFORMS } from "@aaarchive/shared/content";
import { mediaAssetSchema } from "@aaarchive/shared/media";
import { z } from "zod";

// Dashboard content responses (apps/api content.service.ts adminList etc.).

export const contentBlockSchema = z.object({
  key: z.enum(CONTENT_KEYS as [string, ...string[]]),
  data: z.unknown().nullable(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
});
export type ContentBlockRow = z.infer<typeof contentBlockSchema>;

export const contentAdminListSchema = z.object({
  blocks: z.array(contentBlockSchema),
  /** Assets referenced by the blocks, for form previews. */
  media: z.record(z.string(), mediaAssetSchema),
  /** Products referenced by the look file. */
  products: z.record(
    z.string(),
    z.object({ name: z.string(), slug: z.string(), status: z.string() }),
  ),
});
export type ContentAdminList = z.infer<typeof contentAdminListSchema>;

export const savedBlockSchema = contentBlockSchema;

export const adminSocialPostSchema = z.object({
  id: z.string(),
  image: z.object({
    mediaId: z.string(),
    alt: z.string(),
    media: mediaAssetSchema,
  }),
  label: z.string(),
  platform: z.enum(SOCIAL_POST_PLATFORMS),
  link: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  updatedAt: z.string(),
});
export type AdminSocialPost = z.infer<typeof adminSocialPostSchema>;

export const adminPageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  seoTitle: z.string().nullable(),
  seoDesc: z.string().nullable(),
  updatedAt: z.string(),
});
export type AdminPage = z.infer<typeof adminPageSchema>;

export const adminFaqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
export type AdminFaq = z.infer<typeof adminFaqSchema>;
