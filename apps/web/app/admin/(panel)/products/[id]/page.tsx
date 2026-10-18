import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { ProductEditorRoute } from "../_components/product-editor-route";

export const metadata: Metadata = { title: "Edit product" };
// Rendered after the browser session check: see ../../layout.tsx.
export const instant = false;

export default function EditProductPage() {
  return (
    // The id and ?tab= are read in the browser (useParams/useSearchParams).
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <ProductEditorRoute />
    </Suspense>
  );
}
