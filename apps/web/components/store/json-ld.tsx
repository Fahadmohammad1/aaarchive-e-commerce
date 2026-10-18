/**
 * Structured data for search engines (schema.org). A data block, not a
 * script, so the CSP does not apply; "<" is escaped so content can never close
 * the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON with "<" escaped, not HTML (rules.md §8.4)
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Absolute URL for a site path, for structured data and canonical links. */
export function siteUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${path}`;
}
