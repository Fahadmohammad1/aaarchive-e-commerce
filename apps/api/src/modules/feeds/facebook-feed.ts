import { richTextToPlain } from "@aaarchive/shared/rich-text";
import { variantPrice } from "@aaarchive/shared/storefront";

// Facebook / Instagram catalog feed (PRD §10): RSS 2.0 with Google product
// fields, one item per active variant, grouped by product. Availability is
// the status only — never a stock number (PRD §5.6).

export type FeedVariant = {
  id: string;
  stock: number;
  priceOverride: number | null;
  sizeName: string;
  colorName: string;
  colorId: string;
};

export type FeedProduct = {
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string | null;
  category: string;
  basePrice: number;
  salePrice: number | null;
  saleStart: Date | null;
  saleEnd: Date | null;
  images: Array<{ url: string; colorId: string | null }>;
  variants: FeedVariant[];
};

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const tag = (name: string, value: string) =>
  `<${name}>${xmlEscape(value)}</${name}>`;
const money = (taka: number) => `${taka.toFixed(2)} BDT`;

export function buildFacebookFeed(
  products: FeedProduct[],
  site: { url: string; name: string },
  now: Date = new Date(),
): string {
  const base = site.url.replace(/\/$/, "");
  const items: string[] = [];
  for (const p of products) {
    const description = (
      p.shortDesc ||
      richTextToPlain(p.description) ||
      p.name
    ).slice(0, 5000);
    for (const v of p.variants) {
      const image =
        p.images.find((i) => i.colorId === v.colorId)?.url ?? p.images[0]?.url;
      if (!image) continue; // Facebook rejects items without an image.
      const { price, compareAt } = variantPrice(p, v, now);
      items.push(
        [
          "<item>",
          tag("g:id", v.id),
          tag("g:item_group_id", p.slug),
          tag("g:title", `${p.name} — ${v.colorName} / ${v.sizeName}`),
          tag("g:description", description),
          tag("g:link", `${base}/product/${p.slug}`),
          tag("g:image_link", image),
          tag("g:availability", v.stock > 0 ? "in stock" : "out of stock"),
          tag("g:condition", "new"),
          // On sale: the regular price plus sale_price; otherwise one price.
          tag("g:price", money(compareAt ?? price)),
          ...(compareAt ? [tag("g:sale_price", money(price))] : []),
          tag("g:brand", site.name),
          tag("g:product_type", p.category),
          tag("g:color", v.colorName),
          tag("g:size", v.sizeName),
          "</item>",
        ].join(""),
      );
    }
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>',
    tag("title", site.name),
    tag("link", base),
    tag("description", `${site.name} catalog`),
    ...items,
    "</channel></rss>",
  ].join("\n");
}
