import type { Metadata } from "next";
import { ColorsScreen } from "./_components/colors-screen";

export const metadata: Metadata = { title: "Colours" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function ColorsPage() {
  return <ColorsScreen />;
}
