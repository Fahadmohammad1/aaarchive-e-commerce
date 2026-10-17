import { SLUG_MAX_LENGTH, slugify } from "@aaarchive/shared/catalog";

/**
 * A slug for `name` that `isTaken` does not report: "hoodies", then
 * "hoodies-2", "hoodies-3"… Names with no a–z letters (e.g. Bangla only) fall
 * back to `fallback`. The unique index is still the final guard against a
 * race between two saves.
 */
export async function uniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
  fallback = "item",
): Promise<string> {
  const base = slugify(name) || fallback;
  if (!(await isTaken(base))) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`No free slug for "${base}"`);
}
