import type { CartItemInput } from "@aaarchive/shared/checkout";
import { api } from "@/lib/api/api-client";
import type { ValidatedCart } from "./cart-types";

// Storefront: no Zod at runtime (rules.md §4.2).

export function validateCart(
  items: CartItemInput[],
  signal?: AbortSignal,
): Promise<ValidatedCart> {
  return api.post<ValidatedCart>("/cart/validate", { body: { items }, signal });
}
