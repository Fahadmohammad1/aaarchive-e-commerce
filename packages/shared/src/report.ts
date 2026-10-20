import { z } from "zod";

// Sales analytics (owner request 2026-10-20; docs/architecture.md §4.6).
// Ranges are Asia/Dhaka calendar days (UTC+6, no DST), inclusive.

/** Longest range one report may cover, in days. */
export const SALES_REPORT_MAX_DAYS = 366;
/** Range used when the request names no dates. */
export const SALES_REPORT_DEFAULT_DAYS = 30;

const DAY_MS = 86_400_000;
const DHAKA_OFFSET_MS = 6 * 3_600_000;

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "INVALID_DATE" })
  // Round-trip so 2026-02-30 is refused instead of rolling into March.
  .refine(
    (d) => {
      const t = Date.parse(`${d}T00:00:00Z`);
      return !Number.isNaN(t) && new Date(t).toISOString().startsWith(d);
    },
    { message: "INVALID_DATE" },
  );

export const salesReportQuerySchema = z
  .strictObject({ from: daySchema.optional(), to: daySchema.optional() })
  .superRefine((q, ctx) => {
    if (!q.from || !q.to) return;
    const span = daySpan(q.from, q.to);
    if (span < 1) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "RANGE_REVERSED" });
    } else if (span > SALES_REPORT_MAX_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "RANGE_TOO_LONG",
      });
    }
  });
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;

/** Today's date in Dhaka, "2026-10-20". */
export function dhakaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** `day` moved by `n` calendar days. */
export function addDays(day: string, n: number): string {
  const t = Date.parse(`${day}T00:00:00Z`) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Number of days from `from` to `to`, both included (0 or less if reversed). */
export function daySpan(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        DAY_MS,
    ) + 1
  );
}

export type SalesRange = {
  from: string;
  to: string;
  /** Every day of the range, oldest first. */
  days: string[];
  /** The same number of days just before `from`, for comparison. */
  previousFrom: string;
  previousTo: string;
};

/**
 * Fills in missing ends: no dates → the last 30 days up to today; only `from`
 * → up to today; only `to` → the 30 days ending then.
 */
export function resolveSalesRange(
  query: SalesReportQuery,
  now: Date = new Date(),
): SalesRange {
  let to = query.to ?? dhakaToday(now);
  let from = query.from ?? addDays(to, -(SALES_REPORT_DEFAULT_DAYS - 1));
  if (query.from && !query.to && daySpan(from, to) < 1) to = from;
  if (daySpan(from, to) > SALES_REPORT_MAX_DAYS) {
    from = addDays(to, -(SALES_REPORT_MAX_DAYS - 1));
  }
  const span = daySpan(from, to);
  return {
    from,
    to,
    days: Array.from({ length: span }, (_, i) => addDays(from, i)),
    previousFrom: addDays(from, -span),
    previousTo: addDays(from, -1),
  };
}
