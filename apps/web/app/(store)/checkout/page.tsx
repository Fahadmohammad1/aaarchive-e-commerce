import type { Metadata } from "next";
import { AccountProvider } from "@/components/providers/account-provider";
import { getMessages } from "@/lib/i18n/i18n";
import { CheckoutForm } from "./_components/checkout-form";

export const metadata: Metadata = {
  title: getMessages().checkout.title,
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  // Guests check out as before; a signed-in customer gets their details
  // filled in and the order joins their account (PRD §5.10).
  return (
    <AccountProvider>
      <CheckoutForm />
    </AccountProvider>
  );
}
