import type { Metadata } from "next";
import { AccountProvider } from "@/components/providers/account-provider";
import { getMessages } from "@/lib/i18n/i18n";

export const metadata: Metadata = {
  title: { default: getMessages().account.title, template: "%s · Aaarchive" },
  robots: { index: false, follow: false },
};

/** Customer accounts (PRD §5.10). The session lives only under /account. */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountProvider>{children}</AccountProvider>;
}
