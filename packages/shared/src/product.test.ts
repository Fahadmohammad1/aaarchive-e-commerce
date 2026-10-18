import { describe, expect, test } from "bun:test";
import {
  currentPrice,
  isSaleActive,
  missingVariantPairs,
  productInputSchema,
  productUpdateSchema,
  skuFor,
  skuSchema,
  variantBulkUpdateSchema,
} from "./product.js";

const base = { name: "Classic Hoodie", categoryId: "cat1", basePrice: 2490 };

describe("productInputSchema", () => {
  test("fills defaults and dedupes tags, collections and images", () => {
    const p = productInputSchema.parse({
      ...base,
      tags: ["Winter", "winter", "Fleece"],
      collectionIds: ["c1", "c1"],
      images: [
        { mediaId: "m1", alt: "Front" },
        { mediaId: "m1", alt: "Again" },
      ],
      description: "  ",
    });
    expect(p).toMatchObject({
      status: "DRAFT",
      isFeatured: false,
      tags: ["Winter", "Fleece"],
      collectionIds: ["c1"],
      images: [{ mediaId: "m1", alt: "Front", colorId: null }],
      sizeChart: { kind: "none" },
      description: null,
    });
  });

  test("rejects fractional taka, a sale not below base and a reversed window", () => {
    expect(
      productInputSchema.safeParse({ ...base, basePrice: 99.5 }).error
        ?.issues[0]?.message,
    ).toBe("WHOLE_TAKA");
    const sale = productInputSchema.safeParse({
      ...base,
      salePrice: 2490,
      saleStart: "2026-11-01T00:00:00+06:00",
      saleEnd: "2026-10-01T00:00:00+06:00",
    });
    expect(sale.error?.issues.map((i) => [i.path[0], i.message])).toEqual([
      ["salePrice", "SALE_NOT_BELOW_BASE"],
      ["saleEnd", "SALE_END_BEFORE_START"],
    ]);
  });

  test("validates a custom size chart table", () => {
    const bad = productInputSchema.safeParse({
      ...base,
      sizeChart: {
        kind: "custom",
        table: { columns: ["Size"], rows: [["M"]] },
      },
    });
    expect(bad.error?.issues[0]?.message).toBe("TOO_FEW_COLUMNS");
  });

  test("the update schema has no defaults", () => {
    expect(productUpdateSchema.parse({ name: "New name" })).toEqual({
      name: "New name",
    });
  });
});

describe("sale window", () => {
  const p = {
    basePrice: 2490,
    salePrice: 1990,
    saleStart: "2026-11-01T00:00:00Z",
    saleEnd: "2026-11-08T00:00:00Z",
  };
  test("applies only inside [start, end)", () => {
    expect(isSaleActive(p, new Date("2026-10-31T23:59:59Z"))).toBe(false);
    expect(isSaleActive(p, new Date("2026-11-01T00:00:00Z"))).toBe(true);
    expect(isSaleActive(p, new Date("2026-11-08T00:00:00Z"))).toBe(false);
    expect(currentPrice(p, new Date("2026-11-03T00:00:00Z"))).toEqual({
      price: 1990,
      compareAt: 2490,
    });
  });
  test("an open window is always on; no sale price is never on", () => {
    expect(isSaleActive({ ...p, saleStart: null, saleEnd: null })).toBe(true);
    expect(
      currentPrice({ ...p, salePrice: null, saleStart: null, saleEnd: null }),
    ).toEqual({ price: 2490, compareAt: null });
  });
});

describe("variants", () => {
  test("skuFor builds a readable SKU and skuSchema uppercases", () => {
    expect(skuFor("classic-hoodie", "XL", "Charcoal Black")).toBe(
      "CLASSIC-HOODIE-XL-CHA",
    );
    expect(skuFor("eid-panjabi", "40", "Off white")).toBe("EID-PANJABI-40-OFF");
    expect(skuSchema.parse(" ab-12 ")).toBe("AB-12");
    expect(skuSchema.safeParse("AB_12").success).toBe(false);
    expect(skuSchema.safeParse("AB-").success).toBe(false);
  });

  test("missingVariantPairs skips existing pairs and repeats", () => {
    expect(
      missingVariantPairs(
        ["s", "m", "m"],
        ["black", "ivory"],
        [{ sizeId: "s", colorId: "black" }],
      ),
    ).toEqual([
      { sizeId: "m", colorId: "black" },
      { sizeId: "s", colorId: "ivory" },
      { sizeId: "m", colorId: "ivory" },
    ]);
  });

  test("bulk update refuses the same variant twice", () => {
    const r = variantBulkUpdateSchema.safeParse({
      variants: [
        { id: "v1", stock: 3 },
        { id: "v1", stock: 4 },
      ],
    });
    expect(r.success).toBe(false);
  });
});
