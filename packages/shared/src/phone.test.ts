import { describe, expect, test } from "bun:test";
import { bdPhoneSchema, maskBdPhone, normalizeBdPhone } from "./phone.js";

describe("normalizeBdPhone", () => {
  test.each([
    ["01712345689", "01712345689"],
    ["+8801712345689", "01712345689"],
    ["8801712345689", "01712345689"],
    ["+880 1712-345689", "01712345689"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  test.each(["01212345689", "0171234568", "017123456899", "abc"])(
    "rejects %s",
    (input) => {
      expect(normalizeBdPhone(input)).toBeNull();
    },
  );
});

test("maskBdPhone", () => {
  expect(maskBdPhone("01712345689")).toBe("017••••••89");
});

test("bdPhoneSchema normalises and rejects", () => {
  expect(bdPhoneSchema.parse(" +8801712345689 ")).toBe("01712345689");
  expect(bdPhoneSchema.safeParse("12345").success).toBe(false);
});
