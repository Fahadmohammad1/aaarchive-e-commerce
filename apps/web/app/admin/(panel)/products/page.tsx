import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { ProductsScreen } from "./_components/products-screen";

export const metadata: Metadata = { title: "Products" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function ProductsPage() {
  return (
    // Filters live in the URL (useSearchParams needs a Suspense boundary).
    <Suspense fallback={<ListSkeleton />}>
      <ProductsScreen />
    </Suspense>
  );
}
