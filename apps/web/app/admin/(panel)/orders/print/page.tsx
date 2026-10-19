import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { PrintOrders } from "../_components/print-orders";

export const metadata: Metadata = { title: "Print orders" };
// Rendered after the browser session check: see ../../layout.tsx.
export const instant = false;

export default function PrintOrdersPage() {
  return (
    // ?ids= and ?kind= are read in the browser.
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <PrintOrders />
    </Suspense>
  );
}
