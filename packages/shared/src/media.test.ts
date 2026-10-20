import { expect, test } from "bun:test";
import {
  isAcceptedImageFile,
  MEDIA_ACCEPT_ATTR,
  mediaUploadFieldsSchema,
  pickRendition,
} from "./media.js";

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

test("isAcceptedImageFile takes jpg, jpeg, png and webp by type or name", () => {
  for (const file of [
    { name: "a.jpg", type: "image/jpeg" },
    { name: "a.jpeg", type: "image/jpeg" },
    { name: "a.png", type: "image/png" },
    { name: "a.webp", type: "image/webp" },
    // Non-standard or missing types some browsers report.
    { name: "a.jpg", type: "image/jpg" },
    { name: "a.jpg", type: "image/pjpeg" },
    { name: "IMG_01.JPG", type: "" },
    { name: "photo.WebP", type: "" },
    { name: "no-extension", type: "image/png" },
  ]) {
    expect(isAcceptedImageFile(file)).toBe(true);
  }
});

test("isAcceptedImageFile rejects other files", () => {
  for (const file of [
    { name: "a.gif", type: "image/gif" },
    { name: "a.heic", type: "image/heic" },
    { name: "a.pdf", type: "application/pdf" },
    { name: "jpg", type: "" },
  ]) {
    expect(isAcceptedImageFile(file)).toBe(false);
  }
});

test("MEDIA_ACCEPT_ATTR lists types and extensions", () => {
  expect(MEDIA_ACCEPT_ATTR).toBe(
    "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  );
});
