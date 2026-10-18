// Storefront cache tags (docs/architecture.md §3.1). The web tags cached
// fetches with these names; the API sends the same names to /api/revalidate
// after an admin write. One list so the two can never drift apart.

export const cacheTags = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  collections: "collections",
  collection: (slug: string) => `collection:${slug}`,
  home: "home",
  site: "site",
  content: "content",
} as const;

/** Body of POST /api/revalidate (sent by the API, checked by the web). */
export const REVALIDATE_SECRET_HEADER = "x-revalidate-secret";
export const REVALIDATE_MAX_TAGS = 50;
