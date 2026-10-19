import type { Metadata } from "next";
import { CustomersScreen } from "./_components/customers-screen";

export const metadata: Metadata = { title: "Customers" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function CustomersPage() {
  return <CustomersScreen />;
}
