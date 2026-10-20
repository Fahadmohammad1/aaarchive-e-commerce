"use client";

import { forgotPasswordSchema } from "@aaarchive/shared/account";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import {
  type TurnstileHandle,
  TurnstileWidget,
  turnstileSiteKey,
} from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { forgotPassword } from "@/lib/account/account-api";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import {
  AuthCard,
  Notice,
  primaryButtonClass,
} from "../../_components/auth-card";

const formSchema = forgotPasswordSchema.omit({ turnstileToken: true });
type FormInput = z.input<typeof formSchema>;

/** Asks for a reset link. The answer is the same whether or not the email has an account. */
export function ForgotForm() {
  const t = getMessages().account;
  const turnstile = React.useRef<TurnstileHandle>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    if (turnstileSiteKey && !token) {
      setError(storeErrorText("TURNSTILE_FAILED"));
      return;
    }
    try {
      await forgotPassword({ ...values, turnstileToken: token ?? undefined });
      setSent(true);
    } catch (err) {
      turnstile.current?.reset();
      setError(storeErrorText(err));
    }
  });

  return (
    <AuthCard
      title={t.forgotTitle}
      intro={t.forgotIntro}
      footer={
        <Link
          href="/account/login"
          className="text-muted-foreground underline underline-offset-4"
        >
          {t.backToSignIn}
        </Link>
      }
    >
      {sent ? (
        <Notice tone="ok">{t.linkSent}</Notice>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <CheckoutField
            id="fp-email"
            label={t.email}
            error={errors.email?.message}
          >
            <input
              id="fp-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              className={inputClass}
              {...form.register("email")}
            />
          </CheckoutField>
          {turnstileSiteKey && (
            <TurnstileWidget ref={turnstile} onToken={setToken} />
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            disabled={isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? t.sending : t.sendLink}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
