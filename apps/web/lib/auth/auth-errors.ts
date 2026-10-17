import { ApiError } from "@/lib/api/api-error";
import { getMessages } from "@/lib/i18n/i18n";

type ErrorCode = keyof ReturnType<typeof getMessages>["admin"]["errors"];

/** Turns an API error or a Zod message code into text from lib/i18n. */
export function authErrorText(error: unknown): string {
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
