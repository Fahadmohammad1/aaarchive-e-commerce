"use client";

import type { Role } from "@aaarchive/shared/auth";
import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/i18n/i18n";
import { ADMIN_NAV, isActivePath } from "./admin-nav";

type AdminNavListProps = {
  role: Role;
  /** Icon-only rail (desktop collapsed). Labels stay for screen readers. */
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function AdminNavList({
  role,
  collapsed = false,
  onNavigate,
}: AdminNavListProps) {
  const t = getMessages().admin;
  const pathname = usePathname();

  return (
    <nav aria-label={t.shell.mainNav} className="flex flex-col gap-4 p-2">
      {ADMIN_NAV.map((group, index) => {
        const items = group.items.filter(
          (item) => !item.roles || item.roles.includes(role),
        );
        if (items.length === 0) return null;
        return (
          <div key={group.label ?? index} className="flex flex-col gap-0.5">
            {group.label && !collapsed && (
              <p className="px-2.5 pb-1 font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-wider">
                {t.nav[group.label]}
              </p>
            )}
            {items.map((item) => {
              const Icon = item.icon;
              const label = t.nav[item.label];
              const itemClass = cn(
                "flex min-h-11 items-center gap-3 rounded-md px-2.5 text-sm transition-colors md:min-h-9",
                collapsed && "justify-center px-0",
              );
              if (item.soon) {
                return (
                  <span
                    key={item.href}
                    aria-disabled="true"
                    title={collapsed ? `${label} · ${t.shell.soon}` : undefined}
                    className={cn(itemClass, "cursor-not-allowed text-subtle")}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    <span className={cn(collapsed && "sr-only")}>{label}</span>
                    {!collapsed && (
                      <span className="ml-auto font-mono text-[0.625rem] uppercase tracking-wider">
                        {t.shell.soon}
                      </span>
                    )}
                  </span>
                );
              }
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    itemClass,
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className={cn(collapsed && "sr-only")}>{label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
