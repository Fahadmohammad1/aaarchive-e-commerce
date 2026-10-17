"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/store/logo";
import { Wordmark } from "@/components/store/wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

// Header (design §6.1): Menu chip · wordmark logo · Search + Cart chip.
// Transparent over the hero, solid with a hairline once scrolled.
export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const t = getMessages();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menuItems = [
    { label: t.nav.shop, href: "/shop" },
    { label: t.nav.collections, href: "/collection/archive-01-winter-drop" },
    { label: t.nav.categories, href: "/shop#categories" },
    { label: t.nav.trackOrder, href: "/track-order" },
    { label: t.nav.about, href: "/about" },
    { label: t.nav.faq, href: "/faq" },
    { label: t.nav.contact, href: "/contact" },
  ];

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
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="xs"
              className="h-6 w-fit justify-self-start px-2 type-mono-label"
              aria-label={t.header.openMenu}
            >
              {t.header.menu}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="gap-0 bg-background p-0 data-[side=left]:w-full data-[side=left]:border-r-0 data-[side=left]:sm:max-w-none"
          >
            <div className="site-container flex h-(--header-h) items-center justify-between">
              <SheetTitle>
                <Logo sizes="128px" className="h-8 w-auto" />
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t.header.menu}
              </SheetDescription>
              <SheetClose asChild>
                <Button
                  size="icon-xs"
                  className="size-6"
                  aria-label={t.header.closeMenu}
                >
                  <X strokeWidth={1.5} />
                </Button>
              </SheetClose>
            </div>
            <nav className="site-container flex flex-1 flex-col justify-center border-t">
              <ul>
                {menuItems.map((item, i) => (
                  <li key={item.href} className="border-b">
                    <SheetClose asChild>
                      <Link
                        href={item.href}
                        className="flex items-baseline gap-4 py-3 type-display-lg transition-colors hover:text-primary"
                      >
                        <span
                          aria-hidden
                          className="text-muted-foreground type-mono-micro"
                        >{`// ${String(i + 1).padStart(2, "0")}`}</span>
                        {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>
            <Wordmark className="pb-4" />
          </SheetContent>
        </Sheet>

        <Link href="/" aria-label={t.header.home} className="block">
          <Logo
            alt=""
            eager
            sizes="(min-width: 768px) 128px, 104px"
            className="h-8 w-auto md:h-10"
          />
        </Link>

        <div className="flex items-center justify-self-end gap-3">
          <Link
            href="/search"
            className="hidden items-center gap-1.5 text-muted-foreground transition-colors type-mono-label hover:text-foreground md:flex"
          >
            <Search aria-hidden strokeWidth={1.5} className="size-3.5" />
            {t.header.search}
          </Link>
          <Button asChild size="xs" className="h-6 px-2 type-mono-label">
            <Link href="/cart">
              {format(t.header.cart, { count: cartCount })}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
