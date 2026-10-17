import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Label left, ↗ right (design §5.2). Renders a link: every arrow button in the
// storefront navigates somewhere.
type ArrowButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "cream" | "outline";
  size?: "sm" | "md";
  external?: boolean;
  className?: string;
};

export function ArrowButton({
  href,
  children,
  variant = "default",
  size = "md",
  external = false,
  className,
}: ArrowButtonProps) {
  return (
    <Button
      asChild
      variant={variant}
      className={cn(
        "group/arrow min-w-40 justify-between gap-6 px-3 type-mono-label capitalize",
        size === "md" ? "h-11 md:h-10" : "h-8",
        variant === "outline" &&
          "border-line-strong bg-transparent hover:border-foreground hover:bg-transparent",
        className,
      )}
    >
      <Link
        href={href}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {children}
        <ArrowUpRight
          aria-hidden
          strokeWidth={1.5}
          className="transition-transform duration-200 ease-editorial group-hover/arrow:translate-x-0.5 group-hover/arrow:-translate-y-0.5"
        />
      </Link>
    </Button>
  );
}
