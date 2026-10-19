import type { Metadata } from "next";
import { FaqScreen } from "./_components/faq-screen";

export const metadata: Metadata = { title: "FAQ" };
export const instant = false;

export default function FaqAdminPage() {
  return <FaqScreen />;
}
