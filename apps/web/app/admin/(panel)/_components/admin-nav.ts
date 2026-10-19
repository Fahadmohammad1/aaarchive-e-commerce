import type { Role } from "@aaarchive/shared/auth";
import {
  Ban,
  FolderTree,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Palette,
  Ruler,
  Settings,
  ShoppingBag,
  Tag,
  TicketPercent,
  Truck,
  Type,
  Users,
  Wallet,
} from "lucide-react";
import type { getAdminMessages } from "@/lib/i18n/i18n-admin";

type NavKey = keyof ReturnType<typeof getAdminMessages>["nav"];

export type AdminNavItem = {
  label: NavKey;
  href: string;
  icon: LucideIcon;
  /** Not built yet: shown greyed out with a "Soon" badge, not linked. */
  soon?: boolean;
  /** Defaults to OWNER and STAFF. */
  roles?: readonly Role[];
};

export type AdminNavGroup = { label?: NavKey; items: AdminNavItem[] };

// Sidebar sections (design.md §8). Items appear as their phase ships; the
// API checks roles on every request whatever this list shows.
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      { label: "dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "orders", href: "/admin/orders", icon: ShoppingBag },
      { label: "payments", href: "/admin/payments", icon: Wallet },
    ],
  },
  {
    label: "catalog",
    items: [
      { label: "products", href: "/admin/products", icon: Package },
      { label: "categories", href: "/admin/categories", icon: FolderTree },
      { label: "collections", href: "/admin/collections", icon: Layers },
      { label: "sizes", href: "/admin/sizes", icon: Type },
      { label: "colors", href: "/admin/colors", icon: Palette },
      { label: "sizeCharts", href: "/admin/size-charts", icon: Ruler },
    ],
  },
  {
    label: "sales",
    items: [
      { label: "customers", href: "/admin/customers", icon: Users },
      { label: "blocklist", href: "/admin/blocked-phones", icon: Ban },
      { label: "coupons", href: "/admin/coupons", icon: TicketPercent },
      { label: "zones", href: "/admin/zones", icon: Truck },
    ],
  },
  {
    label: "store",
    items: [
      { label: "content", href: "/admin/content", icon: Tag, soon: true },
      {
        label: "settings",
        href: "/admin/settings",
        icon: Settings,
        soon: true,
        roles: ["OWNER"],
      },
    ],
  },
];

/** Exact match for the dashboard, prefix match for every other section. */
export function isActivePath(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}
