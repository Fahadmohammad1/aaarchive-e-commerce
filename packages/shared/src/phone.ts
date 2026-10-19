import { z } from "zod";

import { normalizeBdPhone } from "./phone-format.js";

export { maskBdPhone, normalizeBdPhone } from "./phone-format.js";

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
