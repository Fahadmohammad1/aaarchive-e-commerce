const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayLabelLong = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** "20 Oct" for a Dhaka calendar day "2026-10-20". */
export function formatDay(day: string, withYear = false): string {
  const date = new Date(`${day}T00:00:00Z`);
  return (withYear ? dayLabelLong : dayLabel).format(date);
}

/** Axis ticks: "৳12K". */
export function formatTakaCompact(value: number): string {
  return `৳${compact.format(value)}`;
}

export function formatPercent(value: number): string {
  return percent.format(value);
}

/** Share of `whole`, 0 when there is nothing to divide by. */
export function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/**
 * Change against the previous period: a fraction (0.12 = +12%), or null when
 * the previous period had nothing to compare with.
 */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}
