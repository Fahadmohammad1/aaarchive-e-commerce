import { api } from "@/lib/api/api-client";

// GET /settings/public. Storefront: no Zod at runtime (rules.md §4.2).

type Wallet = { enabled: boolean; number: string; instructions: string };

export type PublicSettings = {
  payments: {
    cod: { enabled: boolean };
    bkash: Wallet;
    nagad: Wallet;
    codAdvanceDeliveryCharge: boolean;
  };
  delivery: { freeDeliveryThreshold: number | null };
  stock: { maxQtyPerVariant: number };
};

export function getPublicSettings(
  signal?: AbortSignal,
): Promise<PublicSettings> {
  return api.get<PublicSettings>("/settings/public", { signal });
}
