import type * as React from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Primary action(s), e.g. a "New" button. */
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl">{title}</h1>
        {description && (
          <p className="max-w-prose text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
