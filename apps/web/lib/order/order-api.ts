import type {
  CheckoutValues,
  TrackOrderInput,
} from "@aaarchive/shared/checkout";
import { api } from "@/lib/api/api-client";
import type { PublicOrder } from "./order-types";

export function placeOrder(body: CheckoutValues): Promise<PublicOrder> {
  return api.post<PublicOrder>("/orders", { body, timeoutMs: 30_000 });
}

export function trackOrder(body: TrackOrderInput): Promise<PublicOrder> {
  return api.post<PublicOrder>("/orders/track", { body });
}
