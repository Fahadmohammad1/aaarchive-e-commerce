import { Breadcrumbs, type Crumb } from "../breadcrumbs";

/** Breadcrumb → title (display-lg) → intro (design §7.1). */
export function ListingHeader({
  title,
  intro,
  crumbs,
}: {
  title: string;
  intro?: string | null;
  crumbs: Crumb[];
}) {
  return (
    <header className="flex flex-col gap-3 pt-6 pb-8 md:pt-10">
      <Breadcrumbs items={crumbs} />
      <h1 className="type-display-lg">{title}</h1>
      {intro && (
        <p className="max-w-prose text-muted-foreground type-mono-body">
          {intro}
        </p>
      )}
    </header>
  );
}
