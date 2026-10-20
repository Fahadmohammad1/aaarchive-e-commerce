import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/i18n";
import { OrdersView } from "./orders-view";

export const metadata: Metadata = { title: getMessages().account.orders };

export default function AccountOrdersPage() {
  return <OrdersView />;
}
