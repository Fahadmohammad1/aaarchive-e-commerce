"use client";

// GA4 + Meta Pixel events (PRD §10). The tags load from analytics-tags.tsx
// when their IDs are set in Settings → Tracking; without them (or when a
// visitor blocks them) every call is a no-op.

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

/**
 * A product page view. `id` is the product slug: the Facebook catalog feed
 * groups variants by it (item_group_id), so Pixel reports a product_group.
 */
export function trackViewItem(item: Omit<Item, "quantity">) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "view_item", {
    currency: "BDT",
    value: item.price,
    items: [{ item_id: item.id, item_name: item.name, price: item.price }],
  });
  window.fbq?.("track", "ViewContent", {
    currency: "BDT",
    value: item.price,
    content_type: "product_group",
    content_ids: [item.id],
    content_name: item.name,
  });
}

export function trackSearch(term: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "search", { search_term: term });
  window.fbq?.("track", "Search", { search_string: term });
}

/** One page view per client-side navigation (the first is sent on load). */
export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "page_view", { page_path: path });
  window.fbq?.("track", "PageView");
}
