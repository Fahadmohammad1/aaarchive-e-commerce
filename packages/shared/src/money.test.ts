import { expect, test } from "bun:test";
import { formatTaka } from "./money.js";

test("formatTaka", () => {
  expect(formatTaka(1250)).toBe("৳1,250");
  expect(formatTaka(70)).toBe("৳70");
  expect(formatTaka(125000)).toBe("৳125,000");
});
