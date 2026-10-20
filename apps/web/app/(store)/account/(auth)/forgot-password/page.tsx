import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/i18n";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: getMessages().account.forgotTitle };

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
