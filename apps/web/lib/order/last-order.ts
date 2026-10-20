import type { PublicOrder } from "./order-types";

// The order just placed, kept for the success page in this tab only
// (sessionStorage). Other visitors cannot open someone's order by number:
// tracking needs the phone too (rules.md §8.3).

const KEY = "aaarchive-last-order";

export function saveLastOrder(order: PublicOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // Private mode or storage full: the page falls back to the number only.
  }
}

export function readLastOrder(orderNumber: string): PublicOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as PublicOrder;
    return order.orderNumber === orderNumber ? order : null;
  } catch {
    return null;
  }
}

// Online payment: the purchase only counts once SSLCommerz sends the customer
// back paid, so the analytics event waits here until then (this tab only).

const PENDING_KEY = "aaarchive-pending-purchase";

export type PendingPurchase = {
  orderNumber: string;
  total: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
};

export function savePendingPurchase(purchase: PendingPurchase) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(purchase));
  } catch {
    // Without storage the event is simply not sent.
  }
}

/** Returns the waiting purchase for this order once, then forgets it. */
export function takePendingPurchase(
  orderNumber: string,
): PendingPurchase | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const purchase = JSON.parse(raw) as PendingPurchase;
    if (purchase.orderNumber !== orderNumber) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return purchase;
  } catch {
    return null;
  }
}
