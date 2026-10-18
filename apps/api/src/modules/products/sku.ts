import { SKU_MAX_LENGTH } from "@aaarchive/shared/product";
import type { Prisma } from "../../generated/prisma/client.js";

/**
 * Makes each candidate SKU unique against the database and the batch itself:
 * "HOODIE-M-BLA", then "HOODIE-M-BLA-2"… The unique index still guards
 * against two saves racing.
 */
export async function uniqueSkus(
  tx: Pick<Prisma.TransactionClient, "variant">,
  candidates: string[],
): Promise<string[]> {
  if (candidates.length === 0) return [];
  const existing = await tx.variant.findMany({
    where: {
      OR: [...new Set(candidates)].map((sku) => ({ sku: { startsWith: sku } })),
    },
    select: { sku: true },
  });
  const taken = new Set(existing.map((v) => v.sku));
  return candidates.map((base) => {
    let sku = base;
    for (let n = 2; taken.has(sku); n++) {
      const suffix = `-${n}`;
      sku = `${base.slice(0, SKU_MAX_LENGTH - suffix.length)}${suffix}`;
    }
    taken.add(sku);
    return sku;
  });
}
