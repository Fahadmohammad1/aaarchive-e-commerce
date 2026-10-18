import { describe, expect, test } from "bun:test";
import { storeProductListQuerySchema, variantPrice } from "./storefront.js";

describe("variantPrice", () => {
  const product = {
    basePrice: 2490,
    salePrice: 1990,
    saleStart: "2026-11-01T00:00:00Z",
    saleEnd: "2026-11-08T00:00:00Z",
  };
  const during = new Date("2026-11-02T00:00:00Z");
  const before = new Date("2026-10-20T00:00:00Z");

  test("the sale price wins over a variant's own price during the sale", () => {
    expect(variantPrice(product, { priceOverride: 2690 }, during)).toEqual({
      price: 1990,
      compareAt: 2690,
    });
    expect(variantPrice(product, { priceOverride: null }, during)).toEqual({
      price: 1990,
      compareAt: 2490,
    });
  });

  test("outside the sale the own price, else the product price, applies", () => {
    expect(variantPrice(product, { priceOverride: 2690 }, before)).toEqual({
      price: 2690,
      compareAt: null,
    });
    expect(variantPrice(product, { priceOverride: null }, before)).toEqual({
      price: 2490,
      compareAt: null,
    });
  });

  test("no crossed-out price when the own price is below the sale", () => {
    expect(variantPrice(product, { priceOverride: 1500 }, during)).toEqual({
      price: 1990,
      compareAt: null,
    });
  });
});

describe("storeProductListQuerySchema", () => {
  test("coerces query strings and normalises repeated params", () => {
    expect(
      storeProductListQuerySchema.parse({
        size: "M",
        color: ["Black", "Ivory"],
        minPrice: "1000",
        inStock: "1",
        page: "2",
      }),
    ).toEqual({
      size: ["M"],
      color: ["Black", "Ivory"],
      minPrice: 1000,
      inStock: true,
      sort: "newest",
      page: 2,
      limit: 12,
    });
  });

  test("rejects unknown params and sorts", () => {
    expect(storeProductListQuerySchema.safeParse({ stock: "1" }).success).toBe(
      false,
    );
    expect(
      storeProductListQuerySchema.safeParse({ sort: "cheap" }).success,
    ).toBe(false);
  });
});
