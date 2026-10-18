import type * as React from "react";
import { Label } from "@/components/ui/label";
import { fieldErrorText } from "@/lib/i18n/error-text";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  /** Zod message code from the form state, translated here. */
  error?: string | boolean;
  children: React.ReactNode;
};

/** Label + control + hint + inline error (rules.md §5.2). */
export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {fieldErrorText(typeof error === "string" ? error : undefined)}
        </p>
      )}
    </div>
  );
}
