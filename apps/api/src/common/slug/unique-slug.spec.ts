import { uniqueSlug } from "./unique-slug.js";

const takenFrom = (taken: string[]) => async (slug: string) =>
  taken.includes(slug);

describe("uniqueSlug", () => {
  it("uses the slugified name when it is free", async () => {
    await expect(uniqueSlug("Winter Drop", takenFrom([]))).resolves.toBe(
      "winter-drop",
    );
  });

  it("adds the first free number when the name is taken", async () => {
    await expect(
      uniqueSlug("Hoodies", takenFrom(["hoodies", "hoodies-2"])),
    ).resolves.toBe("hoodies-3");
  });

  it("falls back when the name has no latin letters", async () => {
    await expect(
      uniqueSlug("পাঞ্জাবি", takenFrom(["category"]), "category"),
    ).resolves.toBe("category-2");
  });

  it("stays within the maximum length with a suffix", async () => {
    const long = "a".repeat(80);
    const slug = await uniqueSlug(long, takenFrom([long]));
    expect(slug).toBe(`${"a".repeat(78)}-2`);
  });
});
