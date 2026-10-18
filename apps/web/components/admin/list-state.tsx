"use client";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

/** Table-shaped placeholder while a list loads (no layout shift). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

/** Inline error with a retry button (rules.md §5.2). */
export function ListError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const t = getAdminMessages();
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-destructive/50 p-4"
    >
      <p className="text-sm">
        {t.common.loadFailed} {errorText(error)}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t.common.retry}
      </Button>
    </div>
  );
}

export function ListEmpty({ children }: { children?: React.ReactNode }) {
  const t = getAdminMessages();
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
      {children ?? t.common.empty}
    </div>
  );
}
