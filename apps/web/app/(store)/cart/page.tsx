import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/i18n";
import { CartPageView } from "./cart-page-view";

export const metadata: Metadata = {
  title: getMessages().cart.pageTitle,
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageView />;
}
