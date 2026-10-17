"use client";

import { type LoginInput, loginSchema } from "@aaarchive/shared/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
  type TurnstileHandle,
  TurnstileWidget,
  turnstileSiteKey,
} from "@/components/admin/turnstile-widget";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/store/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorText } from "@/lib/auth/auth-errors";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { getMessages } from "@/lib/i18n/i18n";

export function LoginForm() {
  const t = getMessages().admin;
  const router = useRouter();
  const params = useSearchParams();
  const { status, login } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(
    null,
  );
  const turnstile = React.useRef<TurnstileHandle>(null);
  const next = safeNextPath(params.get("next"));

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  // Already signed in (e.g. opened /admin/login in a second tab).
  React.useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login({ ...values, turnstileToken: turnstileToken ?? undefined });
      router.replace(next);
    } catch (error) {
      setFormError(authErrorText(error));
      form.resetField("password");
      turnstile.current?.reset();
    }
  });

  const needsTurnstile = Boolean(turnstileSiteKey) && !turnstileToken;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="justify-items-center gap-3 text-center">
        <Logo sizes="160px" eager className="h-12 w-auto" />
        <CardTitle className="text-lg">{t.signInTitle}</CardTitle>
        <CardDescription>{t.signInIntro}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...form.register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-destructive text-sm">
                {t.errors.INVALID_EMAIL}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...form.register("password")}
            />
            {errors.password && (
              <p id="password-error" className="text-destructive text-sm">
                {t.errors.REQUIRED}
              </p>
            )}
          </div>

          <TurnstileWidget ref={turnstile} onToken={setTurnstileToken} />

          {formError && (
            <p
              role="alert"
              className="border border-destructive px-3 py-2 text-destructive text-sm"
            >
              {formError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-10"
            disabled={isSubmitting || needsTurnstile}
          >
            {isSubmitting ? t.signingIn : t.signIn}
          </Button>
          <Link
            href="/"
            className="text-center text-muted-foreground text-sm hover:text-foreground"
          >
            {t.backToStore}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
