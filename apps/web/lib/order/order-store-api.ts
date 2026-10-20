import type {
  CheckoutValues,
  TrackOrderInput,
} from "@aaarchive/shared/checkout";
import { api } from "@/lib/api/api-client";
import type { PlacedOrder, PublicOrder } from "./order-types";

/** Sends the customer's access token when signed in (the order joins their account). */
export function placeOrder(body: CheckoutValues): Promise<PlacedOrder> {
  return api.post<PlacedOrder>("/orders", { body, timeoutMs: 30_000 });
}

export function trackOrder(body: TrackOrderInput): Promise<PublicOrder> {
  return api.post<PublicOrder>("/orders/track", { body });
}
