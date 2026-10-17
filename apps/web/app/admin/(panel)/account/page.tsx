import type { Metadata } from "next";
import { AccountSettings } from "./account-settings";

export const metadata: Metadata = { title: "Account" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function AccountPage() {
  return <AccountSettings />;
}
