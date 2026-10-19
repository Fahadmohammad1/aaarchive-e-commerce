import { toStoreCartLine } from "./cart.mapper.js";
import type { PricedLine } from "./pricing.service.js";

describe("toStoreCartLine", () => {
  it("never carries the stock number (PRD §5.6)", () => {
    const line: PricedLine = {
      variantId: "v1",
      productId: "p1",
      categoryId: "c1",
      productSlug: "hoodie",
      productName: "Hoodie",
      sizeName: "M",
      colorName: "Black",
      sku: "HOODIE-M-BLACK",
      image: null,
      unitPrice: 2490,
      compareAt: null,
      quantity: 2,
      lineTotal: 4980,
      stock: 4231,
      stockStatus: "in_stock",
    };
    const out = toStoreCartLine(line);
    expect(Object.keys(out)).not.toContain("stock");
    expect(Object.keys(out)).not.toContain("sku");
    expect(JSON.stringify(out)).not.toContain("4231");
    expect(out).toMatchObject({ unitPrice: 2490, lineTotal: 4980 });
  });
});
