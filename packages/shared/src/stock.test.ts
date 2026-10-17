import { expect, test } from "bun:test";
import { stockStatusFor } from "./stock.js";

test("stockStatusFor", () => {
  expect(stockStatusFor(0)).toBe("out_of_stock");
  expect(stockStatusFor(-2)).toBe("out_of_stock");
  expect(stockStatusFor(3)).toBe("low_stock");
  expect(stockStatusFor(4)).toBe("in_stock");
  expect(stockStatusFor(5, 10)).toBe("low_stock");
});
