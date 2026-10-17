import { expect, test } from "bun:test";
import { mediaUploadFieldsSchema, pickRendition } from "./media.js";

const renditions = [
  { width: 1600, url: "https://x/1600.webp" },
  { width: 400, url: "https://x/400.webp" },
  { width: 800, url: "https://x/800.webp" },
];

test("pickRendition chooses the smallest rendition that is wide enough", () => {
  expect(pickRendition(renditions, 300)).toBe("https://x/400.webp");
  expect(pickRendition(renditions, 640)).toBe("https://x/800.webp");
  expect(pickRendition(renditions, 3840)).toBe("https://x/1600.webp");
});

test("upload purpose must be known", () => {
  expect(
    mediaUploadFieldsSchema.safeParse({ purpose: "product" }).success,
  ).toBe(true);
  expect(mediaUploadFieldsSchema.safeParse({ purpose: "../etc" }).success).toBe(
    false,
  );
});
