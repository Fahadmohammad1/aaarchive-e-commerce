import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api/api-error";

/**
 * Puts an API error's field codes (`details.fieldErrors`) under the matching
 * inputs. Returns true when at least one field got a message.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!ApiError.isApiError(error)) return false;
  const fieldErrors = (
    error.details as { fieldErrors?: Record<string, string[]> } | undefined
  )?.fieldErrors;
  let applied = false;
  for (const field of fields) {
    const code = fieldErrors?.[field]?.[0];
    if (code) {
      setError(field, { message: code });
      applied = true;
    }
  }
  return applied;
}
