import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/list-state";
import { SalesAnalyticsScreen } from "./_components/sales-analytics-screen";

export const metadata: Metadata = { title: "Sales analytics" };
// Rendered after the browser session check: see ../layout.tsx.
export const instant = false;

export default function AnalyticsPage() {
  return (
    // The period lives in the URL (useSearchParams).
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <SalesAnalyticsScreen />
    </Suspense>
  );
}
