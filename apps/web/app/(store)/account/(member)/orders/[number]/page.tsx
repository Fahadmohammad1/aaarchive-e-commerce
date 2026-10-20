import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages } from "@/lib/i18n/i18n";
import { OrderView } from "./order-view";

export const metadata: Metadata = { title: getMessages().account.orders };

type Props = { params: Promise<{ number: string }> };

async function OrderContent({ params }: Props) {
  const { number } = await params;
  return <OrderView orderNumber={decodeURIComponent(number).toUpperCase()} />;
}

export default function AccountOrderPage(props: Props) {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full max-w-md" />}>
      <OrderContent {...props} />
    </Suspense>
  );
}
