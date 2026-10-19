import { buildFacebookFeed, xmlEscape } from "./facebook-feed.js";

const product = {
  slug: "black-hoodie",
  name: "Black <Oversized> Hoodie",
  shortDesc: "Heavy fleece & soft",
  description: null,
  category: "Hoodies",
  basePrice: 2490,
  salePrice: 1990,
  saleStart: new Date("2026-11-01T00:00:00Z"),
  saleEnd: new Date("2026-11-08T00:00:00Z"),
  images: [
    { url: "https://cdn.example/a.webp", colorId: "c1" },
    { url: "https://cdn.example/b.webp", colorId: "c2" },
  ],
  variants: [
    {
      id: "v1",
      stock: 4231,
      priceOverride: null,
      sizeName: "M",
      colorName: "Black",
      colorId: "c2",
    },
    {
      id: "v2",
      stock: 0,
      priceOverride: 2690,
      sizeName: "L",
      colorName: "Black",
      colorId: "c2",
    },
  ],
};

describe("buildFacebookFeed (PRD §10)", () => {
  it("one escaped item per variant, grouped by product, never a stock number", () => {
    const xml = buildFacebookFeed(
      [product],
      { url: "https://shop.example/", name: "Aaarchive" },
      new Date("2026-10-20T00:00:00Z"),
    );
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain("<g:item_group_id>black-hoodie</g:item_group_id>");
    expect(xml).toContain("Black &lt;Oversized&gt; Hoodie — Black / M");
    expect(xml).toContain(
      "<g:link>https://shop.example/product/black-hoodie</g:link>",
    );
    expect(xml).toContain(
      "<g:image_link>https://cdn.example/b.webp</g:image_link>",
    );
    expect(xml).toContain("<g:availability>in stock</g:availability>");
    expect(xml).toContain("<g:availability>out of stock</g:availability>");
    expect(xml).toContain("<g:price>2690.00 BDT</g:price>");
    expect(xml).not.toContain("4231");
    expect(xml).not.toContain("sale_price");
  });

  it("adds sale_price while the sale runs", () => {
    const xml = buildFacebookFeed(
      [product],
      { url: "https://shop.example", name: "A" },
      new Date("2026-11-02T00:00:00Z"),
    );
    expect(xml).toContain(
      "<g:price>2490.00 BDT</g:price><g:sale_price>1990.00 BDT</g:sale_price>",
    );
  });

  it("escapes XML", () => {
    expect(xmlEscape(`a&b<"c">'`)).toBe("a&amp;b&lt;&quot;c&quot;&gt;&apos;");
  });
});
