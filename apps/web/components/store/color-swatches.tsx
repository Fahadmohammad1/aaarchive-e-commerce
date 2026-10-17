import { cn } from "@/lib/utils";

// Read-only colour dots for cards (design §5.13 is the interactive version).
export function ColorSwatches({
  colors,
  className,
}: {
  colors: readonly string[];
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("flex gap-1", className)}>
      {colors.map((hex) => (
        <span
          key={hex}
          className="size-2.5 rounded-full border border-line-strong"
          style={{ backgroundColor: hex }}
        />
      ))}
    </span>
  );
}
