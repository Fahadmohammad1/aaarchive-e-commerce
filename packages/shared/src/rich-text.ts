// Markdown-lite for product descriptions (user decision 2026-10-19): the
// owner types plain text, the storefront renders these blocks as React
// elements. No HTML is ever stored or injected, so there is nothing to
// sanitise.
//
//   blank line      → new paragraph
//   "- " or "* "    → bullet (consecutive lines form one list)
//   **bold**        → bold
//   single newline  → line break inside a paragraph
//   "## " line      → section heading (pages and FAQ, user decision 2026-10-19)

export type RichInline = { text: string; bold: boolean };
export type RichLine = RichInline[];
export type RichBlock =
  | { type: "paragraph"; lines: RichLine[] }
  | { type: "list"; items: RichLine[] }
  | { type: "heading"; text: RichLine };

const BULLET = /^\s*[-*]\s+/;
const HEADING = /^\s*##\s+/;

/** "a **b** c" → [a ][b, bold][ c]. An unmatched ** stays literal. */
export function parseInline(line: string): RichLine {
  const out: RichLine = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last)
      out.push({ text: line.slice(last, m.index), bold: false });
    out.push({ text: m[1] ?? "", bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), bold: false });
  return out;
}

export function parseRichText(source: string | null | undefined): RichBlock[] {
  if (!source) return [];
  const blocks: RichBlock[] = [];
  const chunks = source.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  for (const chunk of chunks) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.trim());
    let paragraph: RichLine[] = [];
    let list: RichLine[] = [];
    const flush = () => {
      if (paragraph.length)
        blocks.push({ type: "paragraph", lines: paragraph });
      if (list.length) blocks.push({ type: "list", items: list });
      paragraph = [];
      list = [];
    };
    for (const line of lines) {
      if (HEADING.test(line)) {
        flush();
        blocks.push({
          type: "heading",
          text: parseInline(line.replace(HEADING, "").trim()),
        });
      } else if (BULLET.test(line)) {
        if (paragraph.length) {
          blocks.push({ type: "paragraph", lines: paragraph });
          paragraph = [];
        }
        list.push(parseInline(line.replace(BULLET, "").trim()));
      } else {
        if (list.length) {
          blocks.push({ type: "list", items: list });
          list = [];
        }
        paragraph.push(parseInline(line.trim()));
      }
    }
    flush();
  }
  return blocks;
}

/** Plain text (for SEO descriptions and previews), collapsed to one line. */
export function richTextToPlain(source: string | null | undefined): string {
  return parseRichText(source)
    .flatMap((b) =>
      b.type === "paragraph" ? b.lines : b.type === "list" ? b.items : [b.text],
    )
    .map((line) => line.map((i) => i.text).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
