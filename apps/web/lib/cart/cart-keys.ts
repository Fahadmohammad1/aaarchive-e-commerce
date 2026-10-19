import type { CartItemInput } from "@aaarchive/shared/checkout";

export const cartKeys = {
  all: ["cart"] as const,
  validate: (items: CartItemInput[]) =>
    [...cartKeys.all, "validate", items] as const,
  coupon: (code: string, items: CartItemInput[], phone: string | null) =>
    [...cartKeys.all, "coupon", code, items, phone] as const,
};
