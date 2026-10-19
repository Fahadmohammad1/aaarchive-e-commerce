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
