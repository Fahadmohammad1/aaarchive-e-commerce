"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { verifyEmail } from "@/lib/account/account-api";
import { getMessages } from "@/lib/i18n/i18n";
import { AuthCard, Notice } from "../../_components/auth-card";

/** Opens from the emailed link and confirms the address once. */
export function VerifyView() {
  const t = getMessages().account;
  const token = useSearchParams().get("token") ?? "";
  const verify = useMutation({ mutationFn: verifyEmail });
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    verify.mutate(token);
  }, [token, verify]);

  return (
    <AuthCard
      title={t.verifyTitle}
      footer={
        <Link
          href="/account"
          className="text-muted-foreground underline underline-offset-4"
        >
          {t.goToAccount}
        </Link>
      }
    >
      {!token || verify.isError ? (
        <Notice tone="error">{t.invalidLink}</Notice>
      ) : verify.isSuccess ? (
        <Notice tone="ok">{t.verified}</Notice>
      ) : (
        <p aria-busy="true" className="text-muted-foreground type-mono-label">
          {t.verifying}
        </p>
      )}
    </AuthCard>
  );
}
