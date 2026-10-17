"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/i18n";

// Minimal top bar until Phase 2 builds the full admin shell (sidebar, search).
export function AdminTopBar() {
  const t = getMessages().admin;
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  return (
    <header className="border-b bg-sunken">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4">
        <Link
          href="/admin"
          aria-label={t.dashboard}
          className="flex items-center gap-3"
        >
          <Logo sizes="96px" eager className="h-7 w-auto" />
          <span className="hidden text-muted-foreground text-sm sm:inline">
            {t.dashboard}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/admin/account"
            className="hidden text-sm sm:block hover:underline"
          >
            {user.name}
            <span className="ml-2 text-muted-foreground">
              {t.roles[user.role]}
            </span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace("/admin/login");
            }}
          >
            {t.signOut}
          </Button>
        </nav>
      </div>
    </header>
  );
}
