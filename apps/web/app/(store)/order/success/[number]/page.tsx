import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { SuccessView } from "./success-view";

export const metadata: Metadata = {
  title: getMessages().success.title,
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ number: string }> };

async function SuccessContent({ params }: Props) {
  const { number } = await params;
  return <SuccessView orderNumber={decodeURIComponent(number).toUpperCase()} />;
}

export default function OrderSuccessPage(props: Props) {
  return (
    <Suspense fallback={<div className="site-container min-h-[60dvh] py-12" />}>
      <SuccessContent {...props} />
    </Suspense>
  );
}
