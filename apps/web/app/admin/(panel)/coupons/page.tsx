import type { Metadata } from "next";
import { CouponsScreen } from "./_components/coupons-screen";

export const metadata: Metadata = { title: "Coupons" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function CouponsPage() {
  return <CouponsScreen />;
}
