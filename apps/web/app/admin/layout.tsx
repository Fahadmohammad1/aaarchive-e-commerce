import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";

// Everything under /admin: never indexed, slightly rounded (design §8),
// Inter for text. The session lives only here, so storefront visitors never
// trigger auth calls.
export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s — Aaarchive dashboard" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="admin flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
