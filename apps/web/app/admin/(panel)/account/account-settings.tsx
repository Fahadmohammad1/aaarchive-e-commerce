"use client";

import {
  type ChangePasswordInput,
  changePasswordSchema,
} from "@aaarchive/shared/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/providers/auth-provider";
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
import * as authApi from "@/lib/auth/auth-api";
import { authErrorText } from "@/lib/auth/auth-errors";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { TwoFactorCard } from "./two-factor-card";

export function AccountSettings() {
  const t = getAdminMessages();
  const { applySession, logoutEverywhere } = useAuth();
  const router = useRouter();
  const [result, setResult] = React.useState<
    { ok: true } | { ok: false; message: string } | null
  >(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setResult(null);
    try {
      applySession(await authApi.changePassword(values));
      form.reset();
      setResult({ ok: true });
    } catch (error) {
      setResult({ ok: false, message: authErrorText(error) });
    }
  });

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="font-semibold text-2xl">{t.account}</h1>

      <TwoFactorCard />

      <Card>
        <CardHeader>
          <CardTitle>{t.changePassword}</CardTitle>
          <CardDescription>{t.newPasswordHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">{t.currentPassword}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                {...form.register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-destructive text-sm">{t.errors.REQUIRED}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">{t.newPassword}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                {...form.register("newPassword")}
              />
              {errors.newPassword?.message && (
                <p className="text-destructive text-sm">
                  {authErrorText(errors.newPassword.message)}
                </p>
              )}
            </div>
            {result && (
              <p
                role={result.ok ? "status" : "alert"}
                className={
                  result.ok
                    ? "border border-success px-3 py-2 text-sm text-success"
                    : "border border-destructive px-3 py-2 text-destructive text-sm"
                }
              >
                {result.ok ? t.passwordChanged : result.message}
              </p>
            )}
            <Button
              type="submit"
              className="self-start"
              disabled={isSubmitting}
            >
              {isSubmitting ? t.saving : t.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.signOutEverywhere}</CardTitle>
          <CardDescription>{t.signOutEverywhereHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={async () => {
              await logoutEverywhere();
              router.replace("/admin/login");
            }}
          >
            {t.signOutEverywhere}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
