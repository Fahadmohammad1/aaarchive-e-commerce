"use client";

import { claimOrderSchema } from "@aaarchive/shared/account";
import { formatTaka } from "@aaarchive/shared/money";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import { Button } from "@/components/ui/button";
import { useAccountOrders, useClaimOrder } from "@/lib/account/use-account";
import { format, getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { cn } from "@/lib/utils";
import { Notice } from "../../_components/auth-card";
import { Panel } from "../_components/panel";

const date = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

/** My orders (PRD §5.10): newest first, plus "add a guest order". */
export function OrdersView() {
  const t = getMessages();
  const ta = t.account;
  const orders = useAccountOrders();
  const list = orders.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <section
        aria-labelledby="orders-title"
        className="flex flex-col gap-4 lg:col-span-8"
      >
        <div className="flex flex-col gap-1">
          <h2 id="orders-title" className="type-display-sm">
            {ta.orders}
          </h2>
          <p className="text-muted-foreground type-mono-micro">
            {ta.ordersIntro}
          </p>
        </div>
        {orders.isPending ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : orders.isError ? (
          <div className="flex flex-col items-start gap-4">
            <Notice tone="error">{ta.loadFailed}</Notice>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => void orders.refetch()}
            >
              {t.actions.retry}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border border-dashed p-8 text-center">
            <p className="text-muted-foreground type-mono-label">
              {ta.noOrders}
            </p>
            <Link
              href="/shop"
              className="flex min-h-11 items-center gap-2 uppercase underline underline-offset-4 type-mono-label"
            >
              {ta.startShopping}
              <ArrowUpRight aria-hidden strokeWidth={1.5} className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col border-t">
            {list.map((order) => (
              <li
                key={order.orderNumber}
                className="relative border-b hover:bg-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 sm:px-2">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      aria-label={format(ta.viewOrder, {
                        number: order.orderNumber,
                      })}
                      className="font-mono text-base after:absolute after:inset-0"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-muted-foreground type-mono-micro">
                      {date.format(new Date(order.createdAt))} ·{" "}
                      {order.itemCount === 1
                        ? ta.oneItem
                        : format(ta.itemCount, { count: order.itemCount })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "border px-2 py-0.5 uppercase type-mono-micro",
                        order.status === "CANCELLED" ||
                          order.status === "RETURNED"
                          ? "border-destructive"
                          : order.status === "DELIVERED"
                            ? "border-success"
                            : "border-primary",
                      )}
                    >
                      {t.track.statuses[order.status]}
                    </span>
                    <span className="font-mono">{formatTaka(order.total)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {orders.hasNextPage && (
          <Button
            variant="outline"
            disabled={orders.isFetchingNextPage}
            onClick={() => void orders.fetchNextPage()}
            className="h-11 w-fit self-center rounded-none px-6 type-mono-label uppercase"
          >
            {ta.loadMore}
          </Button>
        )}
      </section>
      <div className="lg:col-span-4">
        <ClaimPanel />
      </div>
    </div>
  );
}

type ClaimInput = z.input<typeof claimOrderSchema>;

function ClaimPanel() {
  const ta = getMessages().account;
  const tt = getMessages().track;
  const claim = useClaimOrder();
  const form = useForm<ClaimInput>({
    resolver: zodResolver(claimOrderSchema),
    defaultValues: { phone: "", orderNumber: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await claim.mutateAsync(values);
      form.reset();
    } catch {
      // Shown below from claim.error.
    }
  });

  return (
    <Panel title={ta.claimTitle} intro={ta.claimIntro}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <CheckoutField
          id="cl-phone"
          label={tt.phone}
          error={errors.phone?.message}
        >
          <input
            id="cl-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={Boolean(errors.phone)}
            className={inputClass}
            {...form.register("phone")}
          />
        </CheckoutField>
        <CheckoutField
          id="cl-number"
          label={tt.orderNumber}
          hint={tt.orderNumberHint}
          error={errors.orderNumber?.message}
        >
          <input
            id="cl-number"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(errors.orderNumber)}
            className={cn(inputClass, "font-mono uppercase")}
            {...form.register("orderNumber")}
          />
        </CheckoutField>
        {claim.isError && (
          <Notice tone="error">{storeErrorText(claim.error)}</Notice>
        )}
        {claim.isSuccess && (
          <Notice tone="ok">
            {format(ta.claimed, { number: claim.data.orderNumber })}
          </Notice>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={isSubmitting}
          className="h-11 w-full rounded-none px-3 type-mono-label uppercase"
        >
          {isSubmitting ? ta.claiming : ta.claim}
        </Button>
      </form>
    </Panel>
  );
}
