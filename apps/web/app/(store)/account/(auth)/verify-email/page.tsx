import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { VerifyView } from "./verify-view";

export const metadata: Metadata = { title: getMessages().account.verifyTitle };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <VerifyView />
    </Suspense>
  );
}
