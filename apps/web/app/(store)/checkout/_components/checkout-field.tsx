import type * as React from "react";
import { storeFieldText } from "@/lib/i18n/store-error-text";
import { cn } from "@/lib/utils";

/** Input look from design §5.11: 48px, raised bg, hairline, square, accent focus. */
export const inputClass =
  "h-12 w-full rounded-none border border-border bg-card px-3 text-base outline-none transition-colors placeholder:text-subtle focus:border-primary aria-invalid:border-destructive md:text-sm";

/** Label (mono, muted, uppercase) + control + hint + inline error. */
export function CheckoutField({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  /** Shown after the label, e.g. "optional". */
  optional?: string;
  hint?: string;
  /** Zod message code, translated here. */
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="text-muted-foreground uppercase type-mono-label"
      >
        {label}
        {optional && (
          <span className="normal-case text-subtle"> ({optional})</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground type-mono-micro">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-destructive type-mono-micro">
          {storeFieldText(error)}
        </p>
      )}
    </div>
  );
}
