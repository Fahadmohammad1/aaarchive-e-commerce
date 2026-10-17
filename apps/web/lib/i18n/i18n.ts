import { en, type Messages } from "./en";

/** The active dictionary. English only until Release 2 adds bn.ts. */
export function getMessages(): Messages {
  return en;
}

/** "Cart ({count})" + { count: 2 } → "Cart (2)". */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
