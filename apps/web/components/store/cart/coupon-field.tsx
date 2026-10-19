"use client";

import { formatTaka } from "@aaarchive/shared/money";
import { X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppliedCoupon } from "@/lib/coupon/coupon-schemas";
import { format, getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";

/** Coupon input + Apply, then "CODE applied: −৳…" or the reason it does not apply. */
export function CouponField({
  code,
  onCode,
  quote,
  pending,
  error,
}: {
  code: string | null;
  onCode: (code: string | null) => void;
  quote: AppliedCoupon | undefined;
  pending: boolean;
  error: unknown;
}) {
  const t = getMessages().cart;
  const [draft, setDraft] = React.useState("");

  if (code) {
    return (
      <div className="flex flex-col gap-1" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <span className="type-mono-label">
            {pending
              ? t.applying
              : quote
                ? format(t.couponApplied, {
                    code: quote.code,
                    amount: formatTaka(quote.discount),
                  })
                : code}
          </span>
          <button
            type="button"
            onClick={() => onCode(null)}
            aria-label={t.removeCoupon}
            className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden strokeWidth={1.5} className="size-4" />
          </button>
        </div>
        {error != null && !pending && (
          <p role="alert" className="text-destructive type-mono-micro">
            {storeErrorText(error)}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = draft.trim().toUpperCase();
        if (value) onCode(value);
      }}
    >
      <label htmlFor="coupon-code" className="sr-only">
        {t.coupon}
      </label>
      <Input
        id="coupon-code"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.coupon}
        autoComplete="off"
        maxLength={30}
        className="h-11 flex-1 rounded-none bg-card uppercase type-mono-label"
      />
      <Button
        type="submit"
        variant="outline"
        className="h-11 rounded-none border-line-strong px-4 type-mono-label uppercase"
      >
        {t.applyCoupon}
      </Button>
    </form>
  );
}
