import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { OrdersScreen } from "./_components/orders-screen";

export const metadata: Metadata = { title: "Orders" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function OrdersPage() {
  return (
    // Filters live in the URL (useSearchParams).
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <OrdersScreen />
    </Suspense>
  );
}
