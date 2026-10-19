import { pagePath } from "@aaarchive/shared/content";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteUrl } from "@/components/store/json-ld";
import { getSitemapEntries } from "@/lib/content/content-store-api";

// sitemap.xml (PRD §9.2): every public page. Admin, cart, checkout, order
// and tracking pages are left out (and disallowed in robots.ts). Read at
// request time from a cached fetch, so the build never needs the API.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const fixed: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/faq"), changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
  ];
  try {
    const e = await getSitemapEntries();
    return [
      ...fixed,
      ...e.categories.map((c) => ({
        url: siteUrl(`/category/${c.slug}`),
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...e.collections.map((c) => ({
        url: siteUrl(`/collection/${c.slug}`),
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...e.products.map((p) => ({
        url: siteUrl(`/product/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      // Contact has its own entry above.
      ...e.pages
        .filter((p) => p.slug !== "contact")
        .map((p) => ({
          url: siteUrl(pagePath(p.slug)),
          lastModified: p.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.4,
        })),
    ];
  } catch {
    // API unreachable: still serve the fixed pages rather than an error.
    return fixed;
  }
}
