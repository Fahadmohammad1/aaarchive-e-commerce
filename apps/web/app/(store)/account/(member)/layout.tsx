import { Suspense } from "react";
import { AccountShell } from "./_components/account-shell";

/** Signed-in account pages: guard + account navigation. */
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The shell reads the URL (usePathname), which /orders/[number] only
    // allows inside a Suspense boundary (Cache Components).
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}
