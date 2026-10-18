import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { ProductEditor } from "../_components/product-editor";

export const metadata: Metadata = { title: "New product" };
// Rendered after the browser session check: see ../../layout.tsx.
export const instant = false;

export default function NewProductPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <ProductEditor id={null} />
    </Suspense>
  );
}
