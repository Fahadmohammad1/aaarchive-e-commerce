"use client";

import * as React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
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
import {
  useTotpDisable,
  useTotpEnable,
  useTotpSetup,
  useTotpStatus,
} from "@/lib/auth/use-totp";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

/** Two-factor sign-in on the Account page (rules.md §8.2). */
export function TwoFactorCard() {
  const t = getAdminMessages().twoFactor;
  const { logout } = useAuth();
  const status = useTotpStatus();
  const setup = useTotpSetup();
  const enable = useTotpEnable();
  const disable = useTotpDisable();
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState<string[] | null>(null);
  const [turningOff, setTurningOff] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(authErrorText(e));
      return false;
    }
  };

  const enabled = status.data?.enabled ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t.title}
          {status.data && (
            <Badge
              variant="outline"
              className={enabled ? "border-success text-success" : ""}
            >
              {enabled ? t.on : t.off}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{t.intro}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {backupCodes ? (
          <div className="flex flex-col gap-3">
            <p className="font-medium">{t.backupTitle}</p>
            <p className="text-muted-foreground text-sm">{t.backupIntro}</p>
            <ul className="grid grid-cols-2 gap-1 rounded-md border p-3 font-mono text-sm">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => copy(backupCodes.join("\n"), "codes")}
              >
                {copied === "codes" ? t.copied : t.copyCodes}
              </Button>
              <Button onClick={() => setBackupCodes(null)}>{t.done}</Button>
            </div>
          </div>
        ) : enabled ? (
          <>
            <p className="text-muted-foreground text-sm">
              {format(t.backupLeft, {
                count: status.data?.backupCodesLeft ?? 0,
              })}
            </p>
            {turningOff ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await run(() => disable.mutateAsync({ password, code }))
                  ) {
                    // Turning it off signs out every session, this one too.
                    await logout();
                  }
                }}
              >
                <p className="font-medium">{t.turnOffTitle}</p>
                <p className="text-muted-foreground text-sm">
                  {t.turnOffIntro}
                </p>
                <Label htmlFor="tf-password">
                  {getAdminMessages().currentPassword}
                </Label>
                <Input
                  id="tf-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Label htmlFor="tf-off-code">{t.codeLabel}</Label>
                <Input
                  id="tf-off-code"
                  autoComplete="one-time-code"
                  className="font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTurningOff(false)}
                  >
                    {getAdminMessages().common.cancel}
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={disable.isPending || !password || !code}
                  >
                    {t.turnOff}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-fit"
                onClick={() => setTurningOff(true)}
              >
                {t.turnOff}
              </Button>
            )}
          </>
        ) : setup.data ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await run(async () => {
                const result = await enable.mutateAsync(code);
                setBackupCodes(result.backupCodes);
                setCode("");
              });
            }}
          >
            <p className="text-sm">{t.step1}</p>
            <Button asChild variant="outline" className="w-fit">
              <a href={setup.data.uri}>{t.openApp}</a>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">{t.key}:</span>
              <code className="break-all rounded bg-muted px-2 py-1 font-mono text-sm">
                {setup.data.secret.replace(/(.{4})/g, "$1 ").trim()}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => copy(setup.data?.secret ?? "", "key")}
              >
                {copied === "key" ? t.copied : t.copyKey}
              </Button>
            </div>
            <Label htmlFor="tf-code">{t.step2}</Label>
            <Input
              id="tf-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="w-40 text-center font-mono text-lg tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="submit"
              className="w-fit"
              disabled={enable.isPending || code.trim().length < 6}
            >
              {t.confirm}
            </Button>
          </form>
        ) : (
          <Button
            className="w-fit"
            disabled={setup.isPending || status.isPending}
            onClick={() => void run(() => setup.mutateAsync())}
          >
            {t.start}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
