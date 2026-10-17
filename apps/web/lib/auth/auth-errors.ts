import { errorText } from "@/lib/i18n/error-text";

/** Turns an API error or a Zod message code into text from lib/i18n. */
export function authErrorText(error: unknown): string {
  return errorText(error);
}
