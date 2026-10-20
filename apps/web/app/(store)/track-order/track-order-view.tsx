"use client";

import { normalizeOrderNumber } from "@aaarchive/shared/order-number";
import { normalizeBdPhone } from "@aaarchive/shared/phone-format";
import { ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { OrderResult } from "@/components/store/order-result";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { useTrackOrder } from "@/lib/order/use-orders";
import { cn } from "@/lib/utils";

type FormInput = { phone: string; orderNumber: string };

/** Track order (PRD §5.9, design §7.6): phone + order number → timeline. */
export function TrackOrderView() {
  const t = getMessages().track;
  const params = useSearchParams();
  const track = useTrackOrder();
  // Same rules as trackOrderSchema, checked without Zod: this page is
  // prefetched from every footer, so it must stay light (rules.md §4.2).
  const form = useForm<FormInput>({
    defaultValues: { phone: "", orderNumber: params.get("order") ?? "" },
  });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit((values) => {
    const phone = normalizeBdPhone(values.phone);
    const orderNumber = normalizeOrderNumber(values.orderNumber);
    if (!phone)
      form.setError("phone", {
        message: values.phone.trim() ? "INVALID_BD_PHONE" : "REQUIRED",
      });
    if (!orderNumber) {
      form.setError("orderNumber", {
        message: values.orderNumber.trim()
          ? "INVALID_ORDER_NUMBER"
          : "REQUIRED",
      });
    }
    if (phone && orderNumber) track.mutate({ phone, orderNumber });
  });

  return (
    <div className="site-container flex flex-col items-center gap-8 py-12 md:py-20">
      <div className="flex w-full max-w-md flex-col gap-6 border bg-card p-5 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="type-display-md">{t.title}</h1>
          <p className="text-muted-foreground type-mono-micro">{t.intro}</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <CheckoutField
            id="tr-phone"
            label={t.phone}
            error={errors.phone?.message}
          >
            <input
              id="tr-phone"
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
            id="tr-number"
            label={t.orderNumber}
            hint={t.orderNumberHint}
            error={errors.orderNumber?.message}
          >
            <input
              id="tr-number"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(errors.orderNumber)}
              className={cn(inputClass, "font-mono uppercase")}
              {...form.register("orderNumber")}
            />
          </CheckoutField>
          {track.isError && (
            <p
              role="alert"
              className="border border-destructive p-3 type-mono-label"
            >
              {storeErrorText(track.error)}
            </p>
          )}
          <Button
            type="submit"
            disabled={track.isPending}
            className="h-11 w-full justify-between rounded-none px-3 type-mono-label uppercase"
          >
            {track.isPending ? t.tracking : t.submit}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Button>
        </form>
      </div>
      {track.data && <OrderResult order={track.data} />}
    </div>
  );
}
