"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useAccount } from "@/components/providers/account-provider";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

/**
 * Client guard for /account pages (the API checks the token on every call
 * anyway) and the account header: title, greeting, tabs, sign out.
 */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = getMessages().account;
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, logout } = useAccount();

  React.useEffect(() => {
    if (status === "guest") {
      router.replace(`/account/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div
        aria-busy="true"
        className="site-container flex min-h-[60dvh] flex-col gap-6 py-12"
      >
        <span className="sr-only">{t.loading}</span>
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-11 w-full max-w-md" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  const tabs = [
    { href: "/account", label: t.overview },
    { href: "/account/orders", label: t.orders },
    { href: "/account/addresses", label: t.addresses },
  ];
  const active = (href: string) =>
    href === "/account" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="site-container py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-display-lg">{t.title}</h1>
          <p className="text-muted-foreground type-mono-label">
            {format(t.hello, { name: user.name })}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/account/login");
          }}
          className="min-h-11 text-muted-foreground underline underline-offset-4 type-mono-label hover:text-foreground"
        >
          {t.signOut}
        </button>
      </div>
      <nav aria-label={t.nav} className="mb-8 border-b">
        <ul className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active(tab.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center border-b-2 uppercase whitespace-nowrap type-mono-label transition-colors",
                  active(tab.href)
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
