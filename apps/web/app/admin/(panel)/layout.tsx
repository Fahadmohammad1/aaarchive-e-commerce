import { AdminShell } from "./_components/admin-shell";
import { RequireAdmin } from "./_components/require-admin";

// Dashboard pages render only after the in-browser session check
// (RequireAdmin), so Next cannot pre-render them to check instant navigation.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
