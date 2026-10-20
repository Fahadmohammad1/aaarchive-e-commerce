import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/i18n";
import { AddressesView } from "./addresses-view";

export const metadata: Metadata = { title: getMessages().account.addresses };

export default function AccountAddressesPage() {
  return <AddressesView />;
}
