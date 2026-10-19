import type { PricedLine } from "../cart/pricing.service.js";
import { claimStock } from "./orders.service.js";

const line = (variantId: string, quantity: number) =>
  ({ variantId, quantity }) as PricedLine;

describe("claimStock (PRD §5.6 rule 6, §8.4)", () => {
  it("decrements conditionally, in id order, and aborts on the first miss", async () => {
    const calls: Array<{ id: string; gte: number }> = [];
    const tx = {
      variant: {
        updateMany: async (args: {
          where: { id: string; stock: { gte: number } };
        }) => {
          calls.push({ id: args.where.id, gte: args.where.stock.gte });
          return { count: args.where.id === "b" ? 0 : 1 };
        },
      },
    };
    await expect(
      claimStock(tx as never, [line("c", 1), line("b", 2), line("a", 3)]),
    ).rejects.toMatchObject({
      response: {
        code: "OUT_OF_STOCK",
        message:
          "Not enough stock for this quantity. Please try a smaller amount.",
      },
    });
    // Sorted so racing orders lock rows in the same order; stopped at "b".
    expect(calls).toEqual([
      { id: "a", gte: 3 },
      { id: "b", gte: 2 },
    ]);
  });
});
