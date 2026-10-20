import { ApiError } from "@/lib/api/api-error";
import { getAdminMessages } from "./i18n-admin";

type ErrorCode = keyof ReturnType<typeof getAdminMessages>["errors"];

/**
 * Text for an API error, or for an error code from a shared Zod schema
 * (rules.md §5.2: branch on the code, never on the message).
 */
export function errorText(error: unknown): string {
  const errors = getAdminMessages().errors;
  const code = ApiError.isApiError(error)
    ? error.status === 429
      ? "RATE_LIMITED"
      : // The host refused the body before it reached the API (Vercel: 4.5 MB).
        error.status === 413
        ? "PAYLOAD_TOO_LARGE"
        : error.code
    : typeof error === "string"
      ? error
      : "DEFAULT";
  return code in errors ? errors[code as ErrorCode] : errors.DEFAULT;
}

/** Field message from a Zod issue: known codes are translated, others are generic. */
export function fieldErrorText(message: string | undefined): string {
  const errors = getAdminMessages().errors;
  if (!message) return errors.INVALID;
  return message in errors ? errors[message as ErrorCode] : errors.INVALID;
}
