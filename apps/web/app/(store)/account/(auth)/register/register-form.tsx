"use client";

import { registerSchema } from "@aaarchive/shared/account";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useAccount } from "@/components/providers/account-provider";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import {
  type TurnstileHandle,
  TurnstileWidget,
  turnstileSiteKey,
} from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { applyFieldErrors } from "@/lib/account/account-form-errors";
import { safeAccountNext } from "@/lib/account/account-next";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import {
  AuthCard,
  Notice,
  primaryButtonClass,
} from "../../_components/auth-card";
import { GoogleButton } from "../../_components/google-button";

const formSchema = registerSchema.omit({ turnstileToken: true });
type FormInput = z.input<typeof formSchema>;

/** Create an account (PRD §5.10). Ordering never requires one. */
export function RegisterForm() {
  const t = getMessages().account;
  const router = useRouter();
  const next = safeAccountNext(useSearchParams().get("next"));
  const { status, register } = useAccount();
  const turnstile = React.useRef<TurnstileHandle>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    if (turnstileSiteKey && !token) {
      setError(storeErrorText("TURNSTILE_FAILED"));
      return;
    }
    try {
      await register({ ...values, turnstileToken: token ?? undefined });
    } catch (err) {
      turnstile.current?.reset();
      if (!applyFieldErrors(err, form.setError, ["email", "password", "name"]))
        setError(storeErrorText(err));
    }
  });

  return (
    <AuthCard
      title={t.registerTitle}
      intro={t.registerIntro}
      footer={
        <p className="text-muted-foreground">
          {t.haveAccount}{" "}
          <Link
            href="/account/login"
            className="text-foreground underline underline-offset-4"
          >
            {t.signIn}
          </Link>
        </p>
      }
    >
      <GoogleButton next={next} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <CheckoutField id="re-name" label={t.name} error={errors.name?.message}>
          <input
            id="re-name"
            autoComplete="name"
            maxLength={60}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
            {...form.register("name")}
          />
        </CheckoutField>
        <CheckoutField
          id="re-email"
          label={t.email}
          error={errors.email?.message}
        >
          <input
            id="re-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className={inputClass}
            {...form.register("email")}
          />
        </CheckoutField>
        <CheckoutField
          id="re-password"
          label={t.password}
          hint={t.passwordHint}
          error={errors.password?.message}
        >
          <input
            id="re-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            className={inputClass}
            {...form.register("password")}
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
          {isSubmitting ? t.creating : t.createAccount}
          <ArrowUpRight aria-hidden strokeWidth={1.5} />
        </Button>
      </form>
    </AuthCard>
  );
}
