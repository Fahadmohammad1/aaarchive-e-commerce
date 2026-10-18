import { parseRichText, type RichLine } from "@aaarchive/shared/rich-text";
import { cn } from "cn";
import * as React from "react";

function Line({ line }: { line: RichLine }) {
  return line.map((part, i) =>
    part.bold ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: derived from the text, re-parsed on change
      <strong key={i}>{part.text}</strong>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: derived from the text
      <React.Fragment key={i}>{part.text}</React.Fragment>
    ),
  );
}

/**
 * Renders a Markdown-lite description (`@aaarchive/shared/rich-text`) as
 * React elements: text is never injected as HTML. Server-safe (no hooks).
 */
export function RichText({
  source,
  className,
}: {
  source: string | null | undefined;
  className?: string;
}) {
  const blocks = parseRichText(source);
  if (blocks.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: derived from the text
          <p key={i}>
            {block.lines.map((line, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: derived from the text
              <React.Fragment key={j}>
                {j > 0 && <br />}
                <Line line={line} />
              </React.Fragment>
            ))}
          </p>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: derived from the text
          <ul key={i} className="list-disc pl-5">
            {block.items.map((item, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: derived from the text
              <li key={j}>
                <Line line={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
