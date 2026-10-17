import { cn } from "@/lib/utils";

// `// 01 … // 04` on a hairline (design §5.3). Decorative.
export function IndexMarkers({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const labels = Array.from(
    { length: count },
    (_, i) => `// ${String(i + 1).padStart(2, "0")}`,
  );
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-between border-t text-muted-foreground",
        className,
      )}
    >
      {labels.map((label) => (
        <span
          key={label}
          className="-translate-y-1/2 bg-background px-2 type-mono-micro first:pl-0 last:pr-0"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
