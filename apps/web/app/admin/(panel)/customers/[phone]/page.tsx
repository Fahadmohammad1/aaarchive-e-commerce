import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { CustomerDetailRoute } from "../_components/customer-detail";

export const metadata: Metadata = { title: "Customer" };
// Rendered after the browser session check: see ../../layout.tsx.
export const instant = false;

export default function CustomerPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <CustomerDetailRoute />
    </Suspense>
  );
}
