"use client";

import * as React from "react";

// The colour picked in the variant picker also drives the gallery (PRD §5.5:
// "changing colour switches gallery images"). The gallery is in the cached
// shell and the picker in the request-time hole, so they share this context.

type Selection = {
  colorId: string | null;
  setColorId: (id: string) => void;
};

const SelectionContext = React.createContext<Selection | null>(null);

export function ProductSelectionProvider({
  initialColorId,
  children,
}: {
  initialColorId: string | null;
  children: React.ReactNode;
}) {
  const [colorId, setColorId] = React.useState(initialColorId);
  const value = React.useMemo(() => ({ colorId, setColorId }), [colorId]);
  return <SelectionContext value={value}>{children}</SelectionContext>;
}

export function useProductSelection(): Selection {
  const ctx = React.use(SelectionContext);
  if (!ctx)
    throw new Error("useProductSelection outside ProductSelectionProvider");
  return ctx;
}
