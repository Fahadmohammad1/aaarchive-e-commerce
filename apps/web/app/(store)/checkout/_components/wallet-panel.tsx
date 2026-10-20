"use client";

import { formatTaka } from "@aaarchive/shared/money";
import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import { format, getMessages } from "@/lib/i18n/i18n";

/**
 * bKash / Nagad instructions (design §7.4): the store number in large mono
 * with a Copy chip, the exact amount, three steps, then the sender number
 * and TrxID fields.
 */
export function WalletPanel({
  idPrefix,
  wallet,
  number,
  instructions,
  amount,
  sender,
  trxId,
  errors,
}: {
  idPrefix: string;
  wallet: string;
  number: string;
  instructions: string;
  amount: number;
  sender: UseFormRegisterReturn;
  trxId: UseFormRegisterReturn;
  errors: { senderNumber?: string; trxId?: string };
}) {
  const t = getMessages().checkout;
  const [copied, setCopied] = React.useState(false);
  const values = { wallet, amount: formatTaka(amount), number };

  return (
    <div className="flex flex-col gap-4 border border-border bg-sunken p-4">
      <p className="text-muted-foreground type-mono-micro">
        {format(t.sendTo, values)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-2xl tracking-wider">{number}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(number).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="h-7 bg-primary px-2 text-primary-foreground uppercase type-mono-label"
        >
          <span aria-live="polite">{copied ? t.copied : t.copy}</span>
        </button>
        <span className="ml-auto type-mono-label">{formatTaka(amount)}</span>
      </div>
      <ol className="flex list-decimal flex-col gap-1 pl-5 type-mono-micro">
        {t.walletSteps.map((step) => (
          <li key={step}>{format(step, values)}</li>
        ))}
      </ol>
      {instructions && (
        <p className="whitespace-pre-line text-muted-foreground type-mono-micro">
          {instructions}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckoutField
          id={`${idPrefix}-sender`}
          label={format(t.senderNumber, { wallet })}
          error={errors.senderNumber}
        >
          <input
            id={`${idPrefix}-sender`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={Boolean(errors.senderNumber)}
            className={inputClass}
            {...sender}
          />
        </CheckoutField>
        <CheckoutField
          id={`${idPrefix}-trx`}
          label={t.trxId}
          hint={t.trxIdHint}
          error={errors.trxId}
        >
          <input
            id={`${idPrefix}-trx`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            aria-invalid={Boolean(errors.trxId)}
            className={`${inputClass} font-mono uppercase`}
            {...trxId}
          />
        </CheckoutField>
      </div>
    </div>
  );
}
