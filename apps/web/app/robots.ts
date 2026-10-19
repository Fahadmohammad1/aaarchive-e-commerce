import type { MetadataRoute } from "next";
import { siteUrl } from "@/components/store/json-ld";

// robots.txt (PRD §9.2): private and per-visitor pages are not for search.
export default function robots(): MetadataRoute.Robots {
  // Test deployments (architecture §8.1) must stay out of search results.
  if (process.env.SITE_NOINDEX === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/cart",
        "/checkout",
        "/order/",
        "/track-order",
        "/search",
      ],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
