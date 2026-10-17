import { cn } from "@/lib/utils";

// Giant outlined AAARCHIVE texture (design §5.16). Decorative; 11vw fits 9
// letters edge to edge.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "wordmark-outline block select-none text-center font-display text-[11vw] leading-[0.85] tracking-[-0.02em] uppercase",
        className,
      )}
    >
      Aaarchive
    </span>
  );
}
