"use client";

import { X } from "lucide-react";
import { CartView } from "@/components/store/cart/cart-view";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { useCartCount, useCartStore } from "@/lib/cart/cart-store";
import { format, getMessages } from "@/lib/i18n/i18n";

/** Slide-out cart (design §5.15, §7.3): 420px from the right, full width on phones. */
export function CartDrawer() {
  const returnFocus = useReturnFocus();
  const t = getMessages();
  const open = useCartStore((s) => s.drawerOpen);
  const setOpen = useCartStore((s) => s.setDrawerOpen);
  const count = useCartCount();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        {...returnFocus}
        side="right"
        showCloseButton={false}
        className="gap-0 rounded-none bg-card p-4 shadow-none data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <SheetTitle className="type-display-sm">
            {format(t.cart.title, { count })}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t.cart.pageTitle}
          </SheetDescription>
          <SheetClose asChild>
            <Button size="icon-xs" className="size-6" aria-label={t.cart.close}>
              <X strokeWidth={1.5} />
            </Button>
          </SheetClose>
        </div>
        {/* Mounted only while open, so the cart re-checks on every opening. */}
        {open && <CartView onNavigate={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}
