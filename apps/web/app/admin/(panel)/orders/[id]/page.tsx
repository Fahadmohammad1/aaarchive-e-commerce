import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { OrderDetailRoute } from "../_components/order-detail";

export const metadata: Metadata = { title: "Order" };
// Rendered after the browser session check: see ../../layout.tsx.
export const instant = false;

export default function OrderPage() {
  return (
    // The id is read in the browser (useParams).
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <OrderDetailRoute />
    </Suspense>
  );
}
