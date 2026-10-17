import type { Metadata } from "next";
import { CategoriesScreen } from "./_components/categories-screen";

export const metadata: Metadata = { title: "Categories" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function CategoriesPage() {
  return <CategoriesScreen />;
}
