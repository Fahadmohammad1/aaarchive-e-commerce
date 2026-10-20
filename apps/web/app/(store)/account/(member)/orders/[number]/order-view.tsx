"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { OrderResult } from "@/components/store/order-result";
import { useAccountOrder } from "@/lib/account/use-account";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { Notice } from "../../../_components/auth-card";

/** One of my orders: the same view as tracking. */
export function OrderView({ orderNumber }: { orderNumber: string }) {
  const ta = getMessages().account;
  const order = useAccountOrder(orderNumber);
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/account/orders"
        className="flex min-h-11 w-fit items-center gap-2 text-muted-foreground uppercase type-mono-label hover:text-foreground"
      >
        <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" />
        {ta.backToOrders}
      </Link>
      {order.isPending ? (
        <div className="skeleton h-96 w-full max-w-md" />
      ) : order.isError ? (
        <div className="max-w-md">
          <Notice tone="error">{storeErrorText(order.error)}</Notice>
        </div>
      ) : (
        <OrderResult order={order.data} />
      )}
    </div>
  );
}
