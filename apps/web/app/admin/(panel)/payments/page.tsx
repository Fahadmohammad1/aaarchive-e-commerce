import type { Metadata } from "next";
import { PaymentsScreen } from "./_components/payments-screen";

export const metadata: Metadata = { title: "Payments" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function PaymentsPage() {
  return <PaymentsScreen />;
}
