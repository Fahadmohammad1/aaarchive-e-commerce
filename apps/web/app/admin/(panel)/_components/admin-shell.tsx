"use client";

import { cn } from "cn";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { AdminNavList } from "./admin-nav-list";
import { AdminTopBar } from "./admin-top-bar";

const COLLAPSED_KEY = "aar_admin_sidebar_collapsed";

/**
 * Dashboard frame (design.md §8): 240px sidebar that collapses to an icon
 * rail on desktop, a slide-in menu on phones, top bar, content up to 1400px.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = getAdminMessages();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  // A per-device preference, so it lives in localStorage, not on the server.
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);
  const toggle = () => {
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      return !value;
    });
  };

  if (!user) return null;

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r print:hidden border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex motion-reduce:transition-none",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border px-4",
            collapsed && "justify-center px-0",
          )}
        >
          <Link href="/admin" aria-label={t.dashboard}>
            {collapsed ? (
              <span
                aria-hidden
                className="font-mono font-semibold text-primary text-sm uppercase"
              >
                {getMessages().brand.slice(0, 3)}
              </span>
            ) : (
              <Logo sizes="112px" eager className="h-7 w-auto" />
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNavList role={user.role} collapsed={collapsed} />
        </div>
        <div
          className={cn(
            "border-t border-sidebar-border p-2",
            collapsed && "flex justify-center",
          )}
        >
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={toggle}
            aria-label={collapsed ? t.shell.expand : t.shell.collapse}
            aria-expanded={!collapsed}
            className={cn(!collapsed && "w-full justify-start")}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed && t.shell.collapse}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Invoices and packing slips print without the dashboard chrome. */}
        <div className="print:hidden">
          <AdminTopBar />
        </div>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 md:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
