import type { Metadata } from "next";
import { ContentScreen } from "./_components/content-screen";

export const metadata: Metadata = { title: "Content" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function ContentPage() {
  return <ContentScreen />;
}
