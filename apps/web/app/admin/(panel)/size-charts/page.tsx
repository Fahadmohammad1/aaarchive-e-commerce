import type { Metadata } from "next";
import { SizeChartsScreen } from "./_components/size-charts-screen";

export const metadata: Metadata = { title: "Size charts" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function SizeChartsPage() {
  return <SizeChartsScreen />;
}
