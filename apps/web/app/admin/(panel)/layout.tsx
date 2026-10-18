import { Suspense } from "react";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { AdminShell } from "./_components/admin-shell";
import { RequireAdmin } from "./_components/require-admin";

// Dashboard pages render only after the in-browser session check
// (RequireAdmin), so Next cannot pre-render them to check instant navigation.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    // usePathname (guard, sidebar) suspends while prerendering routes with
    // dynamic params such as /admin/products/[id]; this is that fallback.
    <Suspense
      fallback={
        <p role="status" className="m-auto text-muted-foreground text-sm">
          {getAdminMessages().checkingSession}
        </p>
      }
    >
      <RequireAdmin>
        <AdminShell>{children}</AdminShell>
      </RequireAdmin>
    </Suspense>
  );
}
