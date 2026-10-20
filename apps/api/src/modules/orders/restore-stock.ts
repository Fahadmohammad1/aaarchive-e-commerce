import type { Prisma } from "../../generated/prisma/client.js";

/** Puts each line's quantity back on its variant (PRD §5.6 rule 7). */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  items: ReadonlyArray<{ variantId: string | null; quantity: number }>,
) {
  const lines = items
    .filter((i): i is { variantId: string; quantity: number } =>
      Boolean(i.variantId),
    )
    .sort((a, b) => a.variantId.localeCompare(b.variantId));
  for (const line of lines) {
    // updateMany: a deleted variant (SetNull) is simply skipped.
    await tx.variant.updateMany({
      where: { id: line.variantId },
      data: { stock: { increment: line.quantity } },
    });
  }
}
