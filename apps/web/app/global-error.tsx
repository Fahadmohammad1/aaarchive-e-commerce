"use client";

import { getMessages } from "@/lib/i18n/i18n";

// Last-resort error page when the root layout itself fails (design §7.8).
// It replaces <html>, so it uses plain markup and inline-safe classes only.
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = getMessages();
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 font-mono text-foreground">
        <div
          role="alert"
          className="flex max-w-md flex-col items-center gap-4 border border-destructive p-6 text-center"
        >
          <p>{t.pageError}</p>
          <button
            type="button"
            onClick={reset}
            className="h-11 border border-line-strong px-4 uppercase"
          >
            {t.actions.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
