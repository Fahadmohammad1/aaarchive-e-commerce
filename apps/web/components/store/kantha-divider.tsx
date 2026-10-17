import { cn } from "@/lib/utils";

// Kantha running-stitch between two hairlines (design §5.4). 12px tall.
export function KanthaDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex h-3 flex-col justify-between", className)}
    >
      <span className="h-px bg-primary" />
      <span className="kantha-stitch" />
      <span className="h-px bg-primary" />
    </div>
  );
}
