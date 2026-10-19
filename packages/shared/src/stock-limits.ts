// Store-wide stock defaults (PRD §5.6), without Zod, so storefront client
// code can import them without pulling the validation library into the
// browser bundle (rules.md §4.2). stock.ts re-exports them.

export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const DEFAULT_MAX_QTY_PER_VARIANT = 5;
