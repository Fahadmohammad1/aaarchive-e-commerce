// Order numbers without Zod, for storefront client code (rules.md §4.2).

export const ORDER_NUMBER_PREFIX = "AAR-";

/** "aar-24101", "AAR 24101" and "24101" all mean "AAR-24101"; null if not one. */
export function normalizeOrderNumber(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/\s+/g, "");
  const digits = compact.startsWith("AAR")
    ? compact.replace(/^AAR-?/, "")
    : compact;
  return /^\d{1,12}$/.test(digits) ? `${ORDER_NUMBER_PREFIX}${digits}` : null;
}
