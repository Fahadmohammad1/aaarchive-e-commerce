// Password rules beyond length (rules.md §8.2). Pure functions so the seed
// script can use them too.
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@aaarchive/shared/auth";

// Common passwords of 10+ characters (shorter ones already fail on length).
const COMMON = new Set([
  "1234567890",
  "0987654321",
  "12345678910",
  "123456789a",
  "a123456789",
  "1234567890a",
  "qwertyuiop",
  "qwerty1234",
  "qwerty12345",
  "qwerty123456",
  "1q2w3e4r5t",
  "1q2w3e4r5t6y",
  "1qaz2wsx3edc",
  "zaq12wsxcde3",
  "asdfghjkl1",
  "zxcvbnm123",
  "password12",
  "password123",
  "password1234",
  "passw0rd123",
  "p@ssw0rd123",
  "iloveyou123",
  "iloveyou12",
  "welcome123",
  "welcome1234",
  "letmein123",
  "admin12345",
  "administrator",
  "changeme123",
  "football123",
  "bangladesh",
  "bangladesh1",
  "bangladesh123",
  "dhaka12345",
  "aaarchive1",
  "aaarchive123",
]);

export type PasswordProblem =
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG"
  | "PASSWORD_TOO_COMMON"
  | "PASSWORD_CONTAINS_EMAIL";

/** Returns the first problem with a new password, or null when it is acceptable. */
export function checkNewPassword(
  password: string,
  email?: string | null,
): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "PASSWORD_TOO_SHORT";
  if (password.length > PASSWORD_MAX_LENGTH) return "PASSWORD_TOO_LONG";

  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "PASSWORD_TOO_COMMON";
  // One repeated character, or only the brand name with digits.
  if (/^(.)\1+$/.test(lower)) return "PASSWORD_TOO_COMMON";
  if (/^aaarchive\d*$/.test(lower)) return "PASSWORD_TOO_COMMON";

  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) {
    return "PASSWORD_CONTAINS_EMAIL";
  }
  return null;
}
