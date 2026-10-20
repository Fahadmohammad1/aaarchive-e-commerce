"use client";

import { Search, UserRound } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useCartCount, useCartStore } from "@/lib/cart/cart-store";
import { format, getMessages } from "@/lib/i18n/i18n";

const SiteMenu = dynamic(() => import("./site-menu").then((m) => m.SiteMenu), {
  ssr: false,
});
const CartDrawer = dynamic(
  () => import("./cart-drawer").then((m) => m.CartDrawer),
  { ssr: false },
);
const SearchDialog = dynamic(
  () => import("@/components/store/search-overlay").then((m) => m.SearchDialog),
  { ssr: false },
);

import { cn } from "@/lib/utils";

// Header (design §6.1): Menu chip · wordmark logo · Search + Cart chip.
// Transparent over the hero, solid with a hairline once scrolled.
export function SiteHeader({ logo }: { logo: React.ReactNode }) {
  const t = getMessages();
  const cartCount = useCartCount();
  const drawerOpen = useCartStore((s) => s.drawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  // The drawer's code loads the first time it opens.
  const [cartLoaded, setCartLoaded] = React.useState(false);
  React.useEffect(() => {
    if (drawerOpen) setCartLoaded(true);
  }, [drawerOpen]);

  // The saved cart is read after the first render, so server HTML and the
  // first client render agree (cart-store.ts: skipHydration).
  React.useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  const [scrolled, setScrolled] = React.useState(false);
  // The menu and search dialogs load on first use, not with every page.
  const [menuLoaded, setMenuLoaded] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchLoaded, setSearchLoaded] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-border bg-background/95 backdrop-blur-sm"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="site-container grid h-(--header-h) grid-cols-[1fr_auto_1fr] items-center">
        <Button
          size="xs"
          className="h-6 w-fit justify-self-start px-2 type-mono-label"
          aria-label={t.header.openMenu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuLoaded(true);
            setMenuOpen(true);
          }}
        >
          {t.header.menu}
        </Button>
        {menuLoaded && <SiteMenu open={menuOpen} onOpenChange={setMenuOpen} />}

        <Link href="/" aria-label={t.header.home} className="block">
          {logo}
        </Link>

        <div className="flex items-center justify-self-end gap-3">
          <button
            type="button"
            aria-label={t.search.open}
            aria-haspopup="dialog"
            onClick={() => {
              setSearchLoaded(true);
              setSearchOpen(true);
            }}
            className="flex min-h-11 items-center gap-1.5 text-muted-foreground transition-colors type-mono-label hover:text-foreground"
          >
            <Search
              aria-hidden
              strokeWidth={1.5}
              className="size-4 md:size-3.5"
            />
            <span className="hidden md:inline">{t.header.search}</span>
          </button>
          {searchLoaded && (
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
          )}
          {/* A plain link: the session only loads on /account pages (JS budget). */}
          <Link
            href="/account"
            aria-label={t.header.account}
            className="flex min-h-11 items-center gap-1.5 text-muted-foreground transition-colors type-mono-label hover:text-foreground"
          >
            <UserRound
              aria-hidden
              strokeWidth={1.5}
              className="size-4 md:size-3.5"
            />
            <span className="hidden md:inline">{t.header.account}</span>
          </Link>
          <Button asChild size="xs" className="h-6 px-2 type-mono-label">
            <Link
              href="/cart"
              aria-haspopup="dialog"
              onClick={(event) => {
                // Plain clicks open the drawer; new-tab clicks follow the link.
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                openDrawer();
              }}
            >
              {format(t.header.cart, { count: cartCount })}
            </Link>
          </Button>
          {cartLoaded && <CartDrawer />}
        </div>
      </div>
    </header>
  );
}
