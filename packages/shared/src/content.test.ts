import { describe, expect, test } from "bun:test";
import {
  CONTENT_KEYS,
  contentSchemas,
  heroSchema,
  hrefSchema,
  lookFileSchema,
} from "./content.js";

const image = { mediaId: "media_1", alt: "A" };

describe("hrefSchema", () => {
  test.each([
    "/shop",
    "/category/hoodies?x=1",
    "https://www.instagram.com/aaarchive",
  ])("accepts %s", (href) =>
    expect(hrefSchema.safeParse(href).success).toBe(true),
  );
  test.each(["javascript:alert(1)", "http://insecure.example", "shop", ""])(
    "rejects %s",
    (href) => expect(hrefSchema.safeParse(href).success).toBe(false),
  );
});

test("hero needs its main image and alt text", () => {
  const base = {
    headline: ["Made for every season"],
    audiences: [],
    sideImages: [],
  };
  expect(heroSchema.safeParse({ ...base, mainImage: image }).success).toBe(
    true,
  );
  expect(heroSchema.safeParse(base).success).toBe(false);
  expect(
    heroSchema.safeParse({ ...base, mainImage: { ...image, alt: " " } })
      .success,
  ).toBe(false);
});

test("look file hotspots stay on the image", () => {
  const look = {
    heading: ["Look file", "No. 01"],
    label: "Filed under: Winter",
    intro: "",
    image,
    href: "/collection/winter",
    items: [{ productId: "p1", hotspot: { x: 50, y: 50 } }],
  };
  expect(lookFileSchema.safeParse(look).success).toBe(true);
  expect(
    lookFileSchema.safeParse({
      ...look,
      items: [{ productId: "p1", hotspot: { x: 120, y: 50 } }],
    }).success,
  ).toBe(false);
});

test("registry covers every key", () => {
  expect(CONTENT_KEYS.length).toBe(Object.keys(contentSchemas).length);
  expect(CONTENT_KEYS).toContain("home.hero");
});
