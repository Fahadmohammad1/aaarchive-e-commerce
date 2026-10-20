"use client";

import { newPasswordSchema } from "@aaarchive/shared/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/account/account-api";
import { applyFieldErrors } from "@/lib/account/account-form-errors";
import { ApiError } from "@/lib/api/api-error";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import {
  AuthCard,
  Notice,
  primaryButtonClass,
} from "../../_components/auth-card";

const formSchema = z.object({ password: newPasswordSchema });
type FormInput = z.input<typeof formSchema>;

/** New password from the emailed link (one use, 30 minutes). */
export function ResetForm() {
  const t = getMessages().account;
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    token ? null : t.invalidLink,
  );
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await resetPassword({ token, password: values.password });
      setDone(true);
    } catch (err) {
      // A weak password goes under the field; the link stays usable.
      if (applyFieldErrors(err, form.setError, ["password"])) return;
      // A malformed token fails validation; an old one is INVALID_TOKEN.
      const badLink =
        ApiError.isApiError(err) &&
        (err.code === "INVALID_TOKEN" || err.code === "VALIDATION_ERROR");
      setError(badLink ? t.invalidLink : storeErrorText(err));
    }
  });

  return (
    <AuthCard
      title={t.resetTitle}
      footer={
        <Link
          href={done ? "/account/login" : "/account/forgot-password"}
          className="text-muted-foreground underline underline-offset-4"
        >
          {done ? t.backToSignIn : t.forgotTitle}
        </Link>
      }
    >
      {done ? (
        <Notice tone="ok">{t.resetDone}</Notice>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <CheckoutField
            id="rp-password"
            label={t.newPassword}
            hint={t.passwordHint}
            error={errors.password?.message}
          >
            <input
              id="rp-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              className={inputClass}
              {...form.register("password")}
            />
          </CheckoutField>
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            disabled={isSubmitting || !token}
            className={primaryButtonClass}
          >
            {isSubmitting ? t.saving : t.savePassword}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
