"use client";

import { loginSchema } from "@aaarchive/shared/auth";
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
import { safeAccountNext } from "@/lib/account/account-next";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import {
  AuthCard,
  Notice,
  primaryButtonClass,
} from "../../_components/auth-card";
import { GoogleButton } from "../../_components/google-button";

const formSchema = loginSchema.omit({ turnstileToken: true });
type FormInput = z.input<typeof formSchema>;

/** Sign in (PRD §5.10, design §7.9). */
export function LoginForm() {
  const t = getMessages().account;
  const router = useRouter();
  const params = useSearchParams();
  const next = safeAccountNext(params.get("next"));
  const { status, login } = useAccount();
  const turnstile = React.useRef<TurnstileHandle>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(
    params.get("error") === "google" ? t.googleFailed : null,
  );
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;

  // Already signed in (e.g. back from Google): straight on.
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
      await login({ ...values, turnstileToken: token ?? undefined });
    } catch (err) {
      turnstile.current?.reset();
      setError(storeErrorText(err));
    }
  });

  return (
    <AuthCard
      title={t.loginTitle}
      intro={t.loginIntro}
      footer={
        <>
          <p className="text-muted-foreground">
            {t.noAccount}{" "}
            <Link
              href={`/account/register${next === "/account" ? "" : `?next=${encodeURIComponent(next)}`}`}
              className="text-foreground underline underline-offset-4"
            >
              {t.createAccount}
            </Link>
          </p>
          <Link
            href="/shop"
            className="text-muted-foreground underline underline-offset-4"
          >
            {t.guestNote}
          </Link>
        </>
      }
    >
      <GoogleButton next={next} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <CheckoutField
          id="li-email"
          label={t.email}
          error={errors.email?.message}
        >
          <input
            id="li-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className={inputClass}
            {...form.register("email")}
          />
        </CheckoutField>
        <CheckoutField
          id="li-password"
          label={t.password}
          error={errors.password?.message}
        >
          <input
            id="li-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className={inputClass}
            {...form.register("password")}
          />
        </CheckoutField>
        <Link
          href="/account/forgot-password"
          className="-mt-2 self-end text-muted-foreground underline underline-offset-4 type-mono-micro hover:text-foreground"
        >
          {t.forgot}
        </Link>
        {turnstileSiteKey && (
          <TurnstileWidget ref={turnstile} onToken={setToken} />
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <Button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          {isSubmitting ? t.signingIn : t.signIn}
          <ArrowUpRight aria-hidden strokeWidth={1.5} />
        </Button>
      </form>
    </AuthCard>
  );
}
