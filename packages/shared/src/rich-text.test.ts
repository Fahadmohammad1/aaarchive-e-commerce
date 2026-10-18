import { describe, expect, test } from "bun:test";
import { parseInline, parseRichText, richTextToPlain } from "./rich-text.js";

describe("parseInline", () => {
  test("splits bold runs and keeps an unmatched ** literal", () => {
    expect(parseInline("Soft **320 GSM** fleece")).toEqual([
      { text: "Soft ", bold: false },
      { text: "320 GSM", bold: true },
      { text: " fleece", bold: false },
    ]);
    expect(parseInline("2 ** 3")).toEqual([{ text: "2 ** 3", bold: false }]);
  });
});

describe("parseRichText", () => {
  test("paragraphs, line breaks and bullet lists", () => {
    const blocks = parseRichText(
      "Heavy hoodie.\nMade in Dhaka.\n\n- Cotton\n* Brushed inside\nWash cold",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "list",
      "paragraph",
    ]);
    expect(blocks[0]).toMatchObject({
      lines: [[{ text: "Heavy hoodie." }], [{ text: "Made in Dhaka." }]],
    });
    expect(blocks[1]).toMatchObject({
      items: [[{ text: "Cotton" }], [{ text: "Brushed inside" }]],
    });
  });

  test("treats HTML as plain text and handles empty input", () => {
    expect(parseRichText("<script>x</script>")).toEqual([
      {
        type: "paragraph",
        lines: [[{ text: "<script>x</script>", bold: false }]],
      },
    ]);
    expect(parseRichText(null)).toEqual([]);
    expect(parseRichText("\n \n")).toEqual([]);
  });
});

test("richTextToPlain flattens to one line", () => {
  expect(richTextToPlain("**Warm** hoodie\n\n- Cotton\n- 320 GSM")).toBe(
    "Warm hoodie Cotton 320 GSM",
  );
});
