import type * as React from "react";
import { cn } from "@/lib/utils";

/** A raised section on account pages (design §7.9). */
export function Panel({
  title,
  intro,
  className,
  children,
}: {
  title: string;
  intro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("flex flex-col gap-5 border bg-card p-5 md:p-6", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 className="type-display-sm">{title}</h2>
        {intro && (
          <p className="text-muted-foreground type-mono-micro">{intro}</p>
        )}
      </div>
      {children}
    </section>
  );
}
