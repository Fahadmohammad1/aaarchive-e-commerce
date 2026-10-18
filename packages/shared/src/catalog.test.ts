import { describe, expect, test } from "bun:test";
import {
  categoryInputSchema,
  categoryUpdateSchema,
  collectionInputSchema,
  colorInputSchema,
  sizeChartInputSchema,
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

describe("sizeChartInputSchema", () => {
  const chart = {
    name: "Hoodie (regular fit)",
    columns: ["Size", "Chest", "Length"],
    rows: [
      ["M", "40", "27.5"],
      ["L", "42 – 44", ""],
    ],
  };

  test("accepts numbers, ranges and empty cells, and normalises ranges", () => {
    const parsed = sizeChartInputSchema.parse(chart);
    expect(parsed.rows).toEqual([
      ["M", "40", "27.5"],
      ["L", "42-44", ""],
    ]);
  });

  test("rejects text in a measurement cell, with the cell's path", () => {
    const result = sizeChartInputSchema.safeParse({
      ...chart,
      rows: [["M", "forty", "27"]],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["rows", 0, 1],
      message: "INVALID_MEASUREMENT",
    });
  });

  test("requires a size label and at least one measurement column", () => {
    const noLabel = sizeChartInputSchema.safeParse({
      ...chart,
      rows: [[" ", "40", "27"]],
    });
    expect(noLabel.error?.issues[0]?.path).toEqual(["rows", 0, 0]);
    const oneColumn = sizeChartInputSchema.safeParse({
      ...chart,
      columns: ["Size"],
      rows: [["M"]],
    });
    expect(oneColumn.error?.issues[0]?.message).toBe("TOO_FEW_COLUMNS");
  });

  test("rejects rows that do not match the columns", () => {
    const result = sizeChartInputSchema.safeParse({
      ...chart,
      rows: [["M", "40"]],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["rows", 0],
      message: "ROW_LENGTH",
    });
  });

  test("flags repeated headers and size labels (ignoring case)", () => {
    const result = sizeChartInputSchema.safeParse({
      ...chart,
      columns: ["Size", "Chest", "chest"],
      rows: [
        ["M", "40", "40"],
        ["m", "42", "42"],
      ],
    });
    expect(result.error?.issues.map((i) => i.path)).toEqual([
      ["columns", 2],
      ["rows", 1, 0],
    ]);
  });
});
