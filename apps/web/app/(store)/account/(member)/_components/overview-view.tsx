"use client";

import {
  type AccountProfile,
  customerChangePasswordSchema,
} from "@aaarchive/shared/account";
import { normalizeBdPhone } from "@aaarchive/shared/phone-format";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAccount } from "@/components/providers/account-provider";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import { Button } from "@/components/ui/button";
import { applyFieldErrors } from "@/lib/account/account-form-errors";
import {
  useChangePassword,
  useProfile,
  useResendVerification,
  useUpdateProfile,
} from "@/lib/account/use-account";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { Notice } from "../../_components/auth-card";
import { Panel } from "./panel";

/** Profile, email confirmation, password (PRD §5.10). */
export function OverviewView() {
  const t = getMessages().account;
  const profile = useProfile();

  if (profile.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice tone="error">{t.loadFailed}</Notice>
        <Button
          variant="outline"
          className="rounded-none"
          onClick={() => void profile.refetch()}
        >
          {getMessages().actions.retry}
        </Button>
      </div>
    );
  }
  if (!profile.data) return <div className="skeleton h-64 w-full" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProfilePanel profile={profile.data} />
      <div className="flex flex-col gap-6">
        <PasswordPanel profile={profile.data} />
        <SessionsPanel />
      </div>
    </div>
  );
}

/** Phone may be left empty (removes it); the API normalises a given one. */
const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .min(2, { message: "TOO_SHORT" })
    .max(60, { message: "TOO_LONG" }),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || normalizeBdPhone(v) !== null, {
      message: "INVALID_BD_PHONE",
    }),
});

function ProfilePanel({ profile }: { profile: AccountProfile }) {
  const t = getMessages().account;
  const update = useUpdateProfile();
  const resend = useResendVerification();
  const [saved, setSaved] = React.useState(false);
  const form = useForm<z.input<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: profile.name, phone: profile.phone ?? "" },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setSaved(false);
    try {
      const next = await update.mutateAsync({
        name: values.name,
        phone: values.phone || null,
      });
      form.reset({ name: next.name, phone: next.phone ?? "" });
      setSaved(true);
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, ["name", "phone"]))
        form.setError("root", { message: storeErrorText(err) });
    }
  });

  return (
    <Panel title={t.profile}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <CheckoutField id="pf-name" label={t.name} error={errors.name?.message}>
          <input
            id="pf-name"
            autoComplete="name"
            maxLength={60}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
            {...form.register("name")}
          />
        </CheckoutField>
        <CheckoutField
          id="pf-phone"
          label={t.phone}
          optional={getMessages().checkout.optional}
          hint={t.phoneHint}
          error={errors.phone?.message}
        >
          <input
            id="pf-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={Boolean(errors.phone)}
            className={inputClass}
            {...form.register("phone")}
          />
        </CheckoutField>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground uppercase type-mono-label">
            {t.email}
          </span>
          <span className="break-all font-mono text-sm">{profile.email}</span>
          {!profile.emailVerified && (
            <div className="flex flex-col items-start gap-2 border border-primary p-3">
              <p className="type-mono-micro">{t.emailUnverified}</p>
              {resend.isSuccess ? (
                <p role="status" className="text-primary type-mono-micro">
                  {t.resent}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={resend.isPending}
                  onClick={() => resend.mutate()}
                  className="min-h-11 underline underline-offset-4 type-mono-label hover:text-primary"
                >
                  {t.resend}
                </button>
              )}
              {resend.isError && (
                <p className="text-destructive type-mono-micro">
                  {storeErrorText(resend.error)}
                </p>
              )}
            </div>
          )}
        </div>
        {errors.root?.message && (
          <Notice tone="error">{errors.root.message}</Notice>
        )}
        {saved && <Notice tone="ok">{t.saved}</Notice>}
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          className="h-11 w-fit rounded-none px-6 type-mono-label uppercase"
        >
          {isSubmitting ? t.saving : t.save}
        </Button>
      </form>
    </Panel>
  );
}

function PasswordPanel({ profile }: { profile: AccountProfile }) {
  const t = getMessages().account;
  const change = useChangePassword();
  const [done, setDone] = React.useState(false);
  const form = useForm<z.input<typeof customerChangePasswordSchema>>({
    resolver: zodResolver(customerChangePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  if (!profile.hasPassword) {
    return (
      <Panel title={t.changePassword}>
        <p className="text-muted-foreground type-mono-micro">
          {t.setPasswordHint}
        </p>
      </Panel>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setDone(false);
    try {
      await change.mutateAsync(values);
      form.reset();
      setDone(true);
    } catch (err) {
      if (
        !applyFieldErrors(err, form.setError, [
          "currentPassword",
          "newPassword",
        ])
      ) {
        form.setError("root", { message: storeErrorText(err) });
      }
    }
  });

  return (
    <Panel title={t.changePassword}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <CheckoutField
          id="pw-current"
          label={t.currentPassword}
          error={errors.currentPassword?.message}
        >
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            className={inputClass}
            {...form.register("currentPassword")}
          />
        </CheckoutField>
        <CheckoutField
          id="pw-new"
          label={t.newPassword}
          hint={t.passwordHint}
          error={errors.newPassword?.message}
        >
          <input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            className={inputClass}
            {...form.register("newPassword")}
          />
        </CheckoutField>
        {errors.root?.message && (
          <Notice tone="error">{errors.root.message}</Notice>
        )}
        {done && <Notice tone="ok">{t.passwordChanged}</Notice>}
        <Button
          type="submit"
          variant="outline"
          disabled={isSubmitting}
          className="h-11 w-fit rounded-none px-6 type-mono-label uppercase"
        >
          {isSubmitting ? t.saving : t.savePassword}
        </Button>
      </form>
    </Panel>
  );
}

function SessionsPanel() {
  const t = getMessages().account;
  const router = useRouter();
  const { logoutEverywhere } = useAccount();
  const [busy, setBusy] = React.useState(false);
  return (
    <Panel title={t.signOutEverywhere}>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await logoutEverywhere();
            router.replace("/account/login");
          } finally {
            setBusy(false);
          }
        }}
        className="h-11 w-fit rounded-none px-6 type-mono-label uppercase"
      >
        {t.signOutEverywhere}
      </Button>
    </Panel>
  );
}
