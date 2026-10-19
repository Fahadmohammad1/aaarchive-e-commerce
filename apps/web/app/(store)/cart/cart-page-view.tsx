"use client";

import { CartView } from "@/components/store/cart/cart-view";
import { useCartCount } from "@/lib/cart/cart-store";
import { format, getMessages } from "@/lib/i18n/i18n";

export function CartPageView() {
  const t = getMessages().cart;
  const count = useCartCount();
  return (
    <div className="site-container flex flex-col gap-6 py-8 md:py-12">
      <h1 className="type-display-lg">{format(t.title, { count })}</h1>
      <div className="flex max-w-2xl flex-col">
        <CartView />
      </div>
    </div>
  );
}
