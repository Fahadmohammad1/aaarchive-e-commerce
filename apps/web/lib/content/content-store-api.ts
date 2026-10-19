import { cacheTags } from "@aaarchive/shared/cache-tags";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/lib/api/api-client";
import { ApiError } from "@/lib/api/api-error";
import {
  faqListSchema,
  homeContentSchema,
  publicPageSchema,
  publicSettingsSchema,
  siteContentSchema,
  sitemapSchema,
} from "./content-store-schemas";

// Server-only content fetchers (architecture §4.7). Cached and tagged: a
// save in the dashboard revalidates the tag and the next request is fresh.

export async function getHomeContent() {
  "use cache";
  cacheLife("catalog");
  // Home shows catalog data too (look file, latest entries, categories).
  cacheTag(
    cacheTags.home,
    cacheTags.content,
    cacheTags.products,
    cacheTags.categories,
  );
  return api.get("/content/home", { schema: homeContentSchema });
}

export async function getSiteContent() {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.site, cacheTags.content);
  return api.get("/content/site", { schema: siteContentSchema });
}

/** Store info, SEO defaults and tracking ids (not the checkout's payment data). */
export async function getStoreSettings() {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.site);
  return api.get("/settings/public", { schema: publicSettingsSchema });
}

/** A content page, or null when it does not exist (yet). */
export async function getStorePage(slug: string) {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.content, cacheTags.page(slug));
  try {
    return await api.get(`/pages/${encodeURIComponent(slug)}`, {
      schema: publicPageSchema,
    });
  } catch (error) {
    if (ApiError.isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

export async function getStoreFaq() {
  "use cache";
  cacheLife("catalog");
  cacheTag(cacheTags.faq, cacheTags.content);
  return api.get("/faq", { schema: faqListSchema });
}

/** Slugs for sitemap.xml; refreshed with the catalog and content tags. */
export async function getSitemapEntries() {
  "use cache";
  cacheLife("catalog");
  cacheTag(
    cacheTags.products,
    cacheTags.categories,
    cacheTags.collections,
    cacheTags.content,
  );
  return api.get("/sitemap", { schema: sitemapSchema });
}
