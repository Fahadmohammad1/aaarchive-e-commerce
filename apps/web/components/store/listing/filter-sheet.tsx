"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { getMessages } from "@/lib/i18n/i18n";
import { FilterGroups, type PanelProps } from "./filter-panel";

/** Phone filters as a bottom sheet (design §7.1). Loaded on first tap. */
export function FilterSheet({
  open,
  onOpenChange,
  ...props
}: PanelProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const returnFocus = useReturnFocus();
  const t = getMessages().listing;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...returnFocus}
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-none bg-background px-4 pb-4"
      >
        <SheetTitle className="pt-4 type-display-sm">{t.filters}</SheetTitle>
        <SheetDescription className="sr-only">{t.filters}</SheetDescription>
        <FilterGroups {...props} />
        <SheetClose asChild>
          <Button className="mt-2 h-11 w-full rounded-none type-mono-label">
            {t.showResults}
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
