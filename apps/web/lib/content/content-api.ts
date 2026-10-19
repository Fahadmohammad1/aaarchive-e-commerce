import type {
  ContentKey,
  FaqInput,
  PageInput,
  SocialPostInput,
} from "@aaarchive/shared/content";
import { z } from "zod";
import { api } from "@/lib/api/api-client";
import {
  adminFaqSchema,
  adminPageSchema,
  adminSocialPostSchema,
  contentAdminListSchema,
  savedBlockSchema,
} from "./content-admin-schemas";

// Dashboard content calls (PRD §6.7). Writes are Owner-only in the API.

export function listContent(signal?: AbortSignal) {
  return api.get("/admin/content", { schema: contentAdminListSchema, signal });
}

export function saveContent(key: ContentKey, data: unknown) {
  return api.put(`/admin/content/${encodeURIComponent(key)}`, {
    body: { data },
    schema: savedBlockSchema,
  });
}

const socialList = z.object({ data: z.array(adminSocialPostSchema) });
export const listSocialPosts = (signal?: AbortSignal) =>
  api.get("/admin/social-posts", { schema: socialList, signal });
export const createSocialPost = (body: SocialPostInput) =>
  api.post("/admin/social-posts", { body, schema: adminSocialPostSchema });
export const updateSocialPost = (id: string, body: SocialPostInput) =>
  api.patch(`/admin/social-posts/${encodeURIComponent(id)}`, {
    body,
    schema: adminSocialPostSchema,
  });
export const deleteSocialPost = (id: string): Promise<void> =>
  api.delete(`/admin/social-posts/${encodeURIComponent(id)}`);

const pageList = z.object({ data: z.array(adminPageSchema) });
export const listPages = (signal?: AbortSignal) =>
  api.get("/admin/pages", { schema: pageList, signal });
export const getPage = (id: string, signal?: AbortSignal) =>
  api.get(`/admin/pages/${encodeURIComponent(id)}`, {
    schema: adminPageSchema,
    signal,
  });
export const createPage = (body: PageInput) =>
  api.post("/admin/pages", { body, schema: adminPageSchema });
export const updatePage = (id: string, body: PageInput) =>
  api.patch(`/admin/pages/${encodeURIComponent(id)}`, {
    body,
    schema: adminPageSchema,
  });
export const deletePage = (id: string): Promise<void> =>
  api.delete(`/admin/pages/${encodeURIComponent(id)}`);

const faqList = z.object({ data: z.array(adminFaqSchema) });
export const listFaq = (signal?: AbortSignal) =>
  api.get("/admin/faq", { schema: faqList, signal });
export const createFaq = (body: FaqInput) =>
  api.post("/admin/faq", { body, schema: adminFaqSchema });
export const updateFaq = (id: string, body: FaqInput) =>
  api.patch(`/admin/faq/${encodeURIComponent(id)}`, {
    body,
    schema: adminFaqSchema,
  });
export const deleteFaq = (id: string): Promise<void> =>
  api.delete(`/admin/faq/${encodeURIComponent(id)}`);
