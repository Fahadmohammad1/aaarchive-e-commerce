import type * as React from "react";

/** Centred card for sign-in pages, like Track order (design §7.6, §7.9). */
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="site-container flex flex-col items-center py-12 md:py-20">
      <div className="flex w-full max-w-md flex-col gap-6 border bg-card p-5 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="type-display-md">{title}</h1>
          {intro && (
            <p className="text-muted-foreground type-mono-micro">{intro}</p>
          )}
        </div>
        {children}
      </div>
      {footer && (
        <div className="mt-6 flex w-full max-w-md flex-col items-center gap-2 text-center type-mono-label">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Mono notice line: success (accent border) or error (danger border). */
export function Notice({
  tone,
  children,
}: {
  tone: "ok" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "border border-destructive p-3 type-mono-label"
          : "border border-primary p-3 type-mono-label"
      }
    >
      {children}
    </p>
  );
}

export const primaryButtonClass =
  "h-11 w-full justify-between rounded-none px-3 type-mono-label uppercase";
