import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: getMessages().account.registerTitle,
};

export default function AccountRegisterPage() {
  return (
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <RegisterForm />
    </Suspense>
  );
}
