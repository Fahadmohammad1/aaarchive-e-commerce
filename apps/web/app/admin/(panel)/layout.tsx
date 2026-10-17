import { AdminTopBar } from "./_components/admin-top-bar";
import { RequireAdmin } from "./_components/require-admin";

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RequireAdmin>
      <AdminTopBar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8">
        {children}
      </main>
    </RequireAdmin>
  );
}
