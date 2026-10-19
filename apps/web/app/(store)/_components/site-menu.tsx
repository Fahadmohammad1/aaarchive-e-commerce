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
import { useSiteContent } from "@/lib/content/use-site-content";
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
  // Links from Content → Site, loaded when the menu first opens.
  const site = useSiteContent();
  const menuItems = site.data?.navigation?.menu ?? [];

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
          <ul aria-busy={site.isPending}>
            {site.isPending &&
              [0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="border-b py-3">
                  <div className="skeleton h-10 w-2/3" />
                </li>
              ))}
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
