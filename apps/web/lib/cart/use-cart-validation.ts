"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { validateCart } from "./cart-api";
import { cartKeys } from "./cart-keys";
import { cartItems, useCartStore } from "./cart-store";

/**
 * Re-checks the cart against the API whenever it is shown (PRD §5.7) and
 * applies what the API decided to the cart itself: unavailable lines are
 * dropped, quantities over the store's cap are lowered, and price changes
 * are reported once (`priceChanges`) before the snapshot catches up.
 */
export function useCartValidation(enabled = true) {
  const lines = useCartStore((s) => s.lines);
  const removeMany = useCartStore((s) => s.removeMany);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const refreshPrices = useCartStore((s) => s.refreshPrices);
  const [priceChanges, setPriceChanges] = React.useState<
    Record<string, number>
  >({});
  const items = React.useMemo(() => cartItems(lines), [lines]);

  const query = useQuery({
    queryKey: cartKeys.validate(items),
    queryFn: ({ signal }) => validateCart(items, signal),
    enabled: enabled && items.length > 0,
    // Prices and stock status must be fresh each time the cart opens.
    staleTime: 0,
    placeholderData: (previous) => previous,
  });

  const data = query.data;
  React.useEffect(() => {
    if (!data) return;
    const gone = data.notices
      .filter((n) => n.code === "UNAVAILABLE")
      .map((n) => n.variantId);
    if (gone.length > 0) removeMany(gone);
    for (const n of data.notices) {
      if (n.code !== "QTY_LIMITED") continue;
      const line = data.items.find((i) => i.variantId === n.variantId);
      if (line) setQuantity(line.variantId, line.quantity);
    }
    const current = useCartStore.getState().lines;
    const changed: Record<string, number> = {};
    for (const item of data.items) {
      const line = current.find((l) => l.variantId === item.variantId);
      if (line && line.snapshot.unitPrice !== item.unitPrice) {
        changed[item.variantId] = item.unitPrice;
      }
    }
    if (Object.keys(changed).length > 0) {
      setPriceChanges((prev) => ({ ...prev, ...changed }));
      refreshPrices(changed);
    }
  }, [data, removeMany, setQuantity, refreshPrices]);

  return { ...query, items, priceChanges };
}
