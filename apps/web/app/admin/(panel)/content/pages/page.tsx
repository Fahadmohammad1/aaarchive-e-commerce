import type { Metadata } from "next";
import { PagesScreen } from "./_components/pages-screen";

export const metadata: Metadata = { title: "Pages" };
export const instant = false;

export default function PagesPage() {
  return <PagesScreen />;
}
