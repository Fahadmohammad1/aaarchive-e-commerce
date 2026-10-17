// Money is stored and sent as whole taka (integers) everywhere — PRD §7.
const takaFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** 1250 → "৳1,250". */
export function formatTaka(amount: number): string {
  return `৳${takaFormat.format(amount)}`;
}
