import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bordered choice box (design §5.11): selected = 1px accent border + a small
 * accent square in the corner. A real radio input underneath, so keyboard
 * and screen readers work as usual.
 */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-14 cursor-pointer flex-col justify-center gap-1 border p-3 pr-8 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
        checked ? "border-primary" : "border-border hover:border-line-strong",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {checked && (
        <span
          aria-hidden
          className="absolute top-2 right-2 size-2 bg-primary"
        />
      )}
      {children}
    </label>
  );
}
