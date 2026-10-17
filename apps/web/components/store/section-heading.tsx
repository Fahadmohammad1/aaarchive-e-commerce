import { cn } from "@/lib/utils";

// Two-line uppercase heading + short mono intro (design §3.3).
type SectionHeadingProps = {
  lines: readonly string[];
  intro?: string;
  /** split: heading left, intro right · stack: both left · center */
  align?: "split" | "stack" | "center";
  as?: "h1" | "h2";
  className?: string;
};

export function SectionHeading({
  lines,
  intro,
  align = "split",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  const center = align === "center";
  const split = align === "split";
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        center && "items-center text-center",
        split && "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <Heading className="type-display-lg">
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </Heading>
      {intro && (
        <p
          className={cn(
            "max-w-[42ch] text-muted-foreground type-mono-body",
            split && "md:text-right",
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
