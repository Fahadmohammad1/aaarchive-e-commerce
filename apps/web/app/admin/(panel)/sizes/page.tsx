import type { Metadata } from "next";
import { SizesScreen } from "./_components/sizes-screen";

export const metadata: Metadata = { title: "Sizes" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function SizesPage() {
  return <SizesScreen />;
}
