import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/i18n";
import { CheckoutForm } from "./_components/checkout-form";

export const metadata: Metadata = {
  title: getMessages().checkout.title,
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutForm />;
}
