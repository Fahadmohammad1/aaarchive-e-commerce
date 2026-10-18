"use client";

import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/i18n";

// Error state (design §7.8): inline notice with a danger border and retry.
export default function StoreError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = getMessages().listing;
  return (
    <div className="site-container py-20">
      <div
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-4 border border-destructive p-6 text-center"
      >
        <p className="type-mono-label">{t.loadFailed}</p>
        <Button
          variant="outline"
          onClick={reset}
          className="h-11 rounded-none type-mono-label uppercase"
        >
          {getMessages().actions.retry}
        </Button>
      </div>
    </div>
  );
}
