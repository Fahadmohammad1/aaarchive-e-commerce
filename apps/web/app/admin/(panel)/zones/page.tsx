import type { Metadata } from "next";
import { ZonesScreen } from "./_components/zones-screen";

export const metadata: Metadata = { title: "Delivery zones" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function ZonesPage() {
  return <ZonesScreen />;
}
