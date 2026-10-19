import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { TrackOrderView } from "./track-order-view";

export const metadata: Metadata = {
  title: getMessages().track.title,
  robots: { index: false, follow: true },
};

export default function TrackOrderPage() {
  return (
    // The form reads ?order= from the URL (link from the success page).
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <TrackOrderView />
    </Suspense>
  );
}
