import { formatTaka } from "@aaarchive/shared/money";
import { ApiError } from "@/lib/api/api-error";
import { format, getMessages } from "./i18n";

type StoreErrorCode = keyof ReturnType<typeof getMessages>["errors"];

/**
 * Customer-facing text for an API error or a Zod message code (rules.md
 * §5.2: branch on the code, never show the API's message). Storefront only:
 * the dashboard uses error-text.ts.
 */
export function storeErrorText(error: unknown): string {
  const errors = getMessages().errors;
  const code = ApiError.isApiError(error)
    ? error.status === 429
      ? "RATE_LIMITED"
      : error.code
    : typeof error === "string"
      ? error
      : "DEFAULT";
  if (code === "COUPON_MIN_ORDER" && ApiError.isApiError(error)) {
    const min = (error.details as { minOrder?: number } | undefined)?.minOrder;
    return format(errors.COUPON_MIN_ORDER, {
      amount: typeof min === "number" ? formatTaka(min) : "",
    });
  }
  return code in errors ? errors[code as StoreErrorCode] : errors.DEFAULT;
}

/** Inline field message from a Zod issue code. */
export function storeFieldText(message: string | undefined): string {
  const errors = getMessages().errors;
  if (message && message in errors) return errors[message as StoreErrorCode];
  return errors.REQUIRED;
}
