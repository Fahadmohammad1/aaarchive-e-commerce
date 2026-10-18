import { uniqueSkus } from "./sku.js";

function fakeTx(existing: string[]) {
  return {
    variant: {
      findMany: async () => existing.map((sku) => ({ sku })),
    },
  } as unknown as Parameters<typeof uniqueSkus>[0];
}

describe("uniqueSkus", () => {
  it("keeps free SKUs and numbers taken ones", async () => {
    expect(
      await uniqueSkus(fakeTx(["HOODIE-M-BLA", "HOODIE-M-BLA-2"]), [
        "HOODIE-M-BLA",
        "HOODIE-L-BLA",
      ]),
    ).toEqual(["HOODIE-M-BLA-3", "HOODIE-L-BLA"]);
  });

  it("separates repeats inside one batch", async () => {
    expect(await uniqueSkus(fakeTx([]), ["A-M-B", "A-M-B"])).toEqual([
      "A-M-B",
      "A-M-B-2",
    ]);
  });
});
