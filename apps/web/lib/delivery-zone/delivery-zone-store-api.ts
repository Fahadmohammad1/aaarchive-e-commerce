import { api } from "@/lib/api/api-client";
import type { StoreZone } from "./delivery-zone-schemas";

// Checkout reads: no Zod at runtime in storefront code (rules.md §4.2).

export function listStoreZones(signal?: AbortSignal): Promise<StoreZone[]> {
  return api.get<StoreZone[]>("/delivery-zones", { signal });
}
