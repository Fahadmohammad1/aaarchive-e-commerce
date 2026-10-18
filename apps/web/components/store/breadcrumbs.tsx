import Link from "next/link";
import { getMessages } from "@/lib/i18n/i18n";
import { JsonLd, siteUrl } from "./json-ld";

export type Crumb = { name: string; href: string };

/** "Home / Hoodies / Oversized hoodie" (mono-micro) + BreadcrumbList JSON-LD. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = getMessages();
  const all = [{ name: t.nav.home, href: "/" }, ...items];
  return (
    <>
      <nav aria-label={t.listing.breadcrumb}>
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground type-mono-micro">
          {all.map((crumb, i) => {
            const last = i === all.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {last ? (
                  <span aria-current="page" className="text-foreground">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <Link href={crumb.href} className="hover:text-foreground">
                      {crumb.name}
                    </Link>
                    <span aria-hidden>/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: crumb.name,
            item: siteUrl(crumb.href),
          })),
        }}
      />
    </>
  );
}
