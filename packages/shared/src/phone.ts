import { z } from "zod";

// Bangladeshi mobile numbers: 11 digits, 013–019 — PRD §5.8.
const BD_MOBILE = /^01[3-9]\d{8}$/;

/**
 * Normalises "+880 1712-345689", "8801712345689" or "01712345689" to
 * "01712345689". Returns null when the result is not a valid BD mobile number.
 */
export function normalizeBdPhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  return BD_MOBILE.test(digits) ? digits : null;
}

/** "01712345689" → "017••••••89", for tracking results and the success page. */
export function maskBdPhone(phone: string): string {
  return `${phone.slice(0, 3)}${"•".repeat(phone.length - 5)}${phone.slice(-2)}`;
}

/** Accepts any common spelling and outputs the normalised number. */
export const bdPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = normalizeBdPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "INVALID_BD_PHONE" });
      return z.NEVER;
    }
    return phone;
  });
