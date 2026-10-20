import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: getMessages().account.loginTitle };

export default function AccountLoginPage() {
  return (
    // Reads ?next= and ?error= from the URL.
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <LoginForm />
    </Suspense>
  );
}
