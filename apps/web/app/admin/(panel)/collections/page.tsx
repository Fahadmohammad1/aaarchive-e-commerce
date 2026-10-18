import type { Metadata } from "next";
import { CollectionsScreen } from "./_components/collections-screen";

export const metadata: Metadata = { title: "Collections" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function CollectionsPage() {
  return <CollectionsScreen />;
}
