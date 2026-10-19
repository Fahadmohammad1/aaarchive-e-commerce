"use client";

import * as React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartImage } from "./cart-types";

// The cart (architecture §3.1): client state only. It holds variant ids,
// quantities and a display snapshot for the first paint. Prices shown come
// from POST /cart/validate; the snapshot price is never sent anywhere.

export type CartLine = {
  variantId: string;
  quantity: number;
  /** What the product page showed when it was added. */
  snapshot: {
    slug: string;
    name: string;
    sizeName: string;
    colorName: string;
    unitPrice: number;
    image: CartImage | null;
  };
};

type CartState = {
  lines: CartLine[];
  /** The code the customer typed; the API decides what it is worth. */
  couponCode: string | null;
  drawerOpen: boolean;
  add: (line: CartLine, max: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  removeMany: (variantIds: string[]) => void;
  /** Keeps the display snapshot in step with the prices the API returned. */
  refreshPrices: (prices: Record<string, number>) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
  openDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: null,
      drawerOpen: false,
      add: (line, max) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          if (!existing) {
            return {
              lines: [
                ...s.lines,
                { ...line, quantity: Math.min(line.quantity, max) },
              ],
            };
          }
          return {
            lines: s.lines.map((l) =>
              l.variantId === line.variantId
                ? {
                    ...l,
                    snapshot: line.snapshot,
                    quantity: Math.min(l.quantity + line.quantity, max),
                  }
                : l,
            ),
          };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.variantId === variantId
              ? { ...l, quantity: Math.max(1, quantity) }
              : l,
          ),
        })),
      remove: (variantId) =>
        set((s) => ({
          lines: s.lines.filter((l) => l.variantId !== variantId),
        })),
      removeMany: (variantIds) =>
        set((s) => ({
          lines: s.lines.filter((l) => !variantIds.includes(l.variantId)),
        })),
      refreshPrices: (prices) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.variantId in prices
              ? {
                  ...l,
                  snapshot: { ...l.snapshot, unitPrice: prices[l.variantId] },
                }
              : l,
          ),
        })),
      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ lines: [], couponCode: null }),
      openDrawer: () => set({ drawerOpen: true }),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
    }),
    {
      name: "aaarchive-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, couponCode: s.couponCode }),
      // Rehydrated after mount (CartHydrator) so the server-rendered HTML and
      // the first client render agree.
      skipHydration: true,
    },
  ),
);

/** Lines as the API wants them: ids and quantities only (golden rule 2). */
export function cartItems(lines: readonly CartLine[]) {
  return lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
}

export function useCartCount(): number {
  return useCartStore((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
}

/** False until the saved cart has been read (avoids an "empty cart" flash). */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    const unsubscribe = useCartStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    setHydrated(useCartStore.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}
