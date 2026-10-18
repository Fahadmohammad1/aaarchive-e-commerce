"use client";

import { ExternalLink, LogOut, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getMessages } from "@/lib/i18n/i18n";
import { AdminNavList } from "./admin-nav-list";

export function AdminTopBar() {
  const t = getMessages().admin;
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-sunken/95 backdrop-blur supports-backdrop-filter:bg-sunken/80">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden"
          aria-label={t.shell.openMenu}
          onClick={() => setMenuOpen(true)}
        >
          <Menu />
        </Button>
        <Link
          href="/admin"
          aria-label={t.dashboard}
          className="flex items-center md:hidden"
        >
          <Logo sizes="96px" eager className="h-6 w-auto" />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/" target="_blank" rel="noopener">
              {t.shell.viewStore}
              <ExternalLink />
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                aria-label={t.shell.userMenu}
                className="gap-2"
              >
                <UserRound />
                <span className="hidden max-w-40 truncate sm:inline">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate text-foreground text-sm">
                  {user.name}
                </span>
                <span>{t.roles[user.role]}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/account">
                  <UserRound />
                  {t.account}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="sm:hidden">
                <Link href="/" target="_blank" rel="noopener">
                  <ExternalLink />
                  {t.shell.viewStore}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  await logout();
                  router.replace("/admin/login");
                }}
              >
                <LogOut />
                {t.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-72 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="border-b border-sidebar-border">
            <SheetTitle>
              <Logo sizes="112px" className="h-7 w-auto" />
              <span className="sr-only">{t.dashboard}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <AdminNavList
              role={user.role}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
