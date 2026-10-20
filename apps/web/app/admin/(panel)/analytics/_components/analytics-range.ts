import {
  addDays,
  dhakaToday,
  type SalesReportQuery,
  salesReportQuerySchema,
} from "@aaarchive/shared/report";

export const RANGE_PRESETS = [
  "7d",
  "30d",
  "90d",
  "month",
  "lastMonth",
  "year",
  "custom",
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** A preset as Dhaka dates (the API compares it with the period before). */
export function presetRange(
  preset: Exclude<RangePreset, "custom">,
  now: Date = new Date(),
): Required<SalesReportQuery> {
  const today = dhakaToday(now);
  const firstOfMonth = `${today.slice(0, 8)}01`;
  switch (preset) {
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "month":
      return { from: firstOfMonth, to: today };
    case "lastMonth": {
      const to = addDays(firstOfMonth, -1);
      return { from: `${to.slice(0, 8)}01`, to };
    }
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

/** A custom range the API will accept, or null. */
export function validCustomRange(
  from: string | null,
  to: string | null,
): Required<SalesReportQuery> | null {
  if (!from || !to) return null;
  // Same checks as the API: real dates, in order, at most a year.
  return salesReportQuerySchema.safeParse({ from, to }).success
    ? { from, to }
    : null;
}

/** Reads `?range=…&from=…&to=…`; anything unusable falls back to 30 days. */
export function rangeFromParams(params: URLSearchParams): {
  preset: RangePreset;
  query: Required<SalesReportQuery>;
} {
  const raw = params.get("range");
  const preset = (RANGE_PRESETS as readonly string[]).includes(raw ?? "")
    ? (raw as RangePreset)
    : "30d";
  if (preset === "custom") {
    const custom = validCustomRange(params.get("from"), params.get("to"));
    if (custom) return { preset, query: custom };
    return { preset: "30d", query: presetRange("30d") };
  }
  return { preset, query: presetRange(preset) };
}
