"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/store/logo";
import { Wordmark } from "@/components/store/wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { getMessages } from "@/lib/i18n/i18n";

// Menu overlay (design §5.15). Loaded on the first tap of "Menu" (see
// site-header.tsx), so its dialog code is not in every page's bundle.
export function SiteMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = getMessages();
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
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                    >
                      {`// ${String(i + 1).padStart(2, "0")}`}
                    </span>
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
  );
}
