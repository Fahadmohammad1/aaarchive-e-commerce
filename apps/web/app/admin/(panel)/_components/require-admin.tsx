"use client";

import { isStaffRole } from "@aaarchive/shared/auth";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

/**
 * Client guard for every dashboard page (rules.md §8.3). UX only: the API
 * enforces roles on every request whatever the browser shows.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const t = getAdminMessages();
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "guest") {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status !== "authenticated" || !user) {
    return (
      <p role="status" className="m-auto text-muted-foreground text-sm">
        {t.checkingSession}
      </p>
    );
  }

  if (!isStaffRole(user.role)) {
    return (
      <div className="m-auto flex flex-col items-center gap-4 text-center">
        <p>{t.noAccess}</p>
        <Button variant="outline" onClick={() => logout()}>
          {t.signOut}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
