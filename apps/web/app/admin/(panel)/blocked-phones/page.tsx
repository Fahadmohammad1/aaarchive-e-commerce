import type { Metadata } from "next";
import { BlockedPhonesScreen } from "./_components/blocked-phones-screen";

export const metadata: Metadata = { title: "Blocked numbers" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function BlockedPhonesPage() {
  return <BlockedPhonesScreen />;
}
