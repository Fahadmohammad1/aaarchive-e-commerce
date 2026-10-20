import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: getMessages().account.resetTitle };

export default function ResetPasswordPage() {
  return (
    // Reads ?token= from the emailed link.
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <ResetForm />
    </Suspense>
  );
}
