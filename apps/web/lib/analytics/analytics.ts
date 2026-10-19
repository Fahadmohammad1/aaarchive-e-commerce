"use client";

// GA4 + Meta Pixel ecommerce events (PRD §10). The tags themselves load in
// Phase 7 with IDs from Settings; until then (or when a visitor blocks them)
// every call is a no-op.

type Item = { id: string; name: string; price: number; quantity: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function send(
  ga4: string,
  pixel: string,
  value: number,
  items: Item[],
  extra: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", ga4, {
    currency: "BDT",
    value,
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    ...extra,
  });
  window.fbq?.("track", pixel, {
    currency: "BDT",
    value,
    content_type: "product",
    content_ids: items.map((i) => i.id),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  });
}

const total = (items: Item[]) =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export function trackAddToCart(item: Item) {
  send("add_to_cart", "AddToCart", item.price * item.quantity, [item]);
}

export function trackBeginCheckout(items: Item[]) {
  send("begin_checkout", "InitiateCheckout", total(items), items);
}

export function trackPurchase(
  orderNumber: string,
  value: number,
  items: Item[],
) {
  send("purchase", "Purchase", value, items, { transaction_id: orderNumber });
}
