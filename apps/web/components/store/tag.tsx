import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The garment-tag chip (design §5.1), built on shadcn's Badge.
const variantMap = {
  accent: "default",
  outline: "outline",
  sale: "sale",
  "stock-low": "default",
  "stock-out": "stock-out",
} as const;

type TagProps = React.ComponentProps<typeof Badge> & {
  tone?: keyof typeof variantMap;
};

export function Tag({ tone = "accent", className, ...props }: TagProps) {
  return (
    <Badge
      variant={variantMap[tone]}
      className={cn(
        "h-5 px-2 type-mono-label",
        tone === "outline" && "border-line-strong uppercase",
        className,
      )}
      {...props}
    />
  );
}
