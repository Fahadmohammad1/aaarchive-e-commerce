"use client";

import * as React from "react";

/**
 * Radix dialogs return focus on close only to their own `*Trigger`. Ours are
 * mostly opened from state (lazy-loaded overlays, table rows, menu items), so
 * without this, focus falls to <body> and keyboard users lose their place.
 * Spread the result onto `DialogContent` / `SheetContent` / `AlertDialogContent`.
 *
 * Don't use `autoFocus` inside such a dialog: it moves focus before the opener
 * is recorded. Pass the element as `initialFocusRef` instead.
 */
export function useReturnFocus(
  initialFocusRef?: React.RefObject<HTMLElement | null>,
) {
  const opener = React.useRef<HTMLElement | null>(null);
  return React.useMemo(
    () => ({
      // Fires before Radix moves focus in, so activeElement is still the opener.
      onOpenAutoFocus: (event: Event) => {
        const active = document.activeElement;
        opener.current =
          active instanceof HTMLElement && active !== document.body
            ? active
            : null;
        if (initialFocusRef?.current) {
          event.preventDefault();
          initialFocusRef.current.focus();
        }
      },
      onCloseAutoFocus: (event: Event) => {
        const el = opener.current;
        opener.current = null;
        // A removed opener (e.g. a closed dropdown item) leaves Radix's default.
        if (!el?.isConnected) return;
        event.preventDefault();
        el.focus();
      },
    }),
    [initialFocusRef],
  );
}
