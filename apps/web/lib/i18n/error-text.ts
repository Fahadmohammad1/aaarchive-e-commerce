import { ApiError } from "@/lib/api/api-error";
import { getMessages } from "./i18n";

type ErrorCode = keyof ReturnType<typeof getMessages>["admin"]["errors"];

/**
 * Text for an API error, or for an error code from a shared Zod schema
 * (rules.md §5.2: branch on the code, never on the message).
 */
export function errorText(error: unknown): string {
  const errors = getMessages().admin.errors;
  const code = ApiError.isApiError(error)
    ? error.status === 429
      ? "RATE_LIMITED"
      : error.code
    : typeof error === "string"
      ? error
      : "DEFAULT";
  return code in errors ? errors[code as ErrorCode] : errors.DEFAULT;
}

/** Field message from a Zod issue: known codes are translated, others are generic. */
export function fieldErrorText(message: string | undefined): string {
  const errors = getMessages().admin.errors;
  if (!message) return errors.INVALID;
  return message in errors ? errors[message as ErrorCode] : errors.INVALID;
}
