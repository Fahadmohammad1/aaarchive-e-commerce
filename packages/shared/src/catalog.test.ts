import { describe, expect, test } from "bun:test";
import {
  categoryInputSchema,
  categoryUpdateSchema,
  collectionInputSchema,
  colorInputSchema,
  sizeInputSchema,
  slugify,
  slugSchema,
} from "./catalog.js";

describe("slugify", () => {
  test("lowercases, joins words with hyphens and trims edges", () => {
    expect(slugify("  Eid Collection '26! ")).toBe("eid-collection-26");
    expect(slugify("T-Shirts & Tees")).toBe("t-shirts-and-tees");
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  test("drops letters outside a–z (may return an empty string)", () => {
    expect(slugify("পাঞ্জাবি")).toBe("");
    expect(slugify("পাঞ্জাবি Panjabi")).toBe("panjabi");
  });

  test("never ends with a hyphen after truncation", () => {
    const slug = slugify(`${"a".repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slugSchema", () => {
  test("accepts lowercase words joined by single hyphens", () => {
    expect(slugSchema.parse("winter-drop-2026")).toBe("winter-drop-2026");
  });

  test.each(["Winter", "winter--drop", "-winter", "winter_drop", ""])(
    "rejects %p",
    (value) => {
      expect(slugSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("category and collection schemas", () => {
  test("create fills defaults and turns an empty description into null", () => {
    expect(
      categoryInputSchema.parse({ name: " Hoodies ", description: "" }),
    ).toEqual({
      name: "Hoodies",
      description: null,
      image: null,
      sortOrder: 0,
      showOnHome: false,
    });
    expect(collectionInputSchema.parse({ name: "Eid" }).isActive).toBe(true);
  });

  test("update keeps only the fields sent (no defaults on PATCH)", () => {
    expect(categoryUpdateSchema.parse({ showOnHome: true })).toEqual({
      showOnHome: true,
    });
  });

  test("rejects unknown fields and images without alt text", () => {
    expect(
      categoryInputSchema.safeParse({ name: "Hoodies", stock: 3 }).success,
    ).toBe(false);
    expect(
      categoryInputSchema.safeParse({
        name: "Hoodies",
        image: { mediaId: "m1", alt: "" },
      }).success,
    ).toBe(false);
  });
});

describe("size and colour schemas", () => {
  test("size names are short labels", () => {
    expect(sizeInputSchema.parse({ name: "XL" })).toEqual({
      name: "XL",
      sortOrder: 0,
    });
    expect(sizeInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  test("colour hex is #RRGGBB, stored upper-case", () => {
    expect(colorInputSchema.parse({ name: "Sand", hex: "#e4ddc0" }).hex).toBe(
      "#E4DDC0",
    );
    expect(
      colorInputSchema.safeParse({ name: "Sand", hex: "e4ddc0" }).success,
    ).toBe(false);
    expect(
      colorInputSchema.safeParse({ name: "Sand", hex: "#fff" }).success,
    ).toBe(false);
  });
});
