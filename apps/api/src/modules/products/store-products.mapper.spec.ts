import type { MediaService } from "../media/media.service.js";
import {
  type StoreProductRow,
  type StoreSummaryRow,
  toStoreProduct,
  toStoreProductStock,
  toStoreProductSummary,
} from "./store-products.mapper.js";

const media = {
  toDto: (row: { id: string }) => ({ id: row.id, renditions: [] }),
} as unknown as MediaService;

/** Every key anywhere in a JSON value. */
function keys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) keys(v, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keys(v, out);
    }
  }
  return out;
}

const STOCK_KEYS = ["stock", "lowStockThreshold", "quantity", "available"];

const base = {
  id: "p1",
  slug: "classic-hoodie",
  name: "Classic Hoodie",
  shortDesc: null,
  description: null,
  fabric: "Cotton",
  gsm: 320,
  care: null,
  basePrice: 2490,
  salePrice: 1990,
  saleStart: null,
  saleEnd: null,
  lowStockThreshold: 2,
  seoTitle: null,
  seoDesc: null,
  updatedAt: new Date("2026-10-19T00:00:00Z"),
  category: { slug: "hoodies", name: "Hoodies" },
  images: [{ media: { id: "m1" }, alt: "Front", colorId: null }],
};

describe("public product mappers", () => {
  it("summary: status only, out_of_stock when every variant is", () => {
    const row = {
      ...base,
      variants: [
        { stock: 0, color: { name: "Black", hex: "#000000", sortOrder: 0 } },
        { stock: 7, color: { name: "Black", hex: "#000000", sortOrder: 0 } },
      ],
    } as unknown as StoreSummaryRow;
    const card = toStoreProductSummary(row, media);
    expect(card).toMatchObject({
      price: 1990,
      compareAt: 2490,
      stockStatus: "in_stock",
      colors: [{ name: "Black", hex: "#000000" }],
    });
    const soldOut = toStoreProductSummary(
      { ...row, variants: [{ ...row.variants[0] }] } as StoreSummaryRow,
      media,
    );
    expect(soldOut.stockStatus).toBe("out_of_stock");
    for (const k of STOCK_KEYS) expect(keys(card).has(k)).toBe(false);
    expect(JSON.stringify(card)).not.toContain('"7"');
  });

  it("product page and stock status carry no stock number", () => {
    const row = {
      ...base,
      sizeChart: null,
      variants: [
        {
          id: "v1",
          sizeId: "s1",
          colorId: "c1",
          priceOverride: 2690,
          size: { id: "s1", name: "XL", sortOrder: 3 },
          color: { id: "c1", name: "Black", hex: "#000000", sortOrder: 0 },
        },
      ],
    } as unknown as StoreProductRow;
    const page = toStoreProduct(row, media);
    // Sale price wins over the variant's own price (user decision 2026-10-19).
    expect(page.variants[0]).toEqual({
      id: "v1",
      sizeId: "s1",
      colorId: "c1",
      price: 1990,
      compareAt: 2690,
    });
    for (const k of STOCK_KEYS) expect(keys(page).has(k)).toBe(false);

    const status = toStoreProductStock({
      lowStockThreshold: 2,
      variants: [
        { id: "v1", stock: 2 },
        { id: "v2", stock: 0 },
        { id: "v3", stock: 40 },
      ],
    });
    expect(status).toEqual({
      variants: [
        { id: "v1", stockStatus: "low_stock" },
        { id: "v2", stockStatus: "out_of_stock" },
        { id: "v3", stockStatus: "in_stock" },
      ],
    });
    expect(JSON.stringify(status)).not.toMatch(/\b40\b/);
  });
});
