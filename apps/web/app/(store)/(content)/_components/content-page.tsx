import { richTextToPlain } from "@aaarchive/shared/rich-text";
import type { Metadata } from "next";
import { RichText } from "@/components/store/rich-text";
import type { PublicPage } from "@/lib/content/content-store-schemas";

/** Metadata for a content page: its SEO fields, else title + first words. */
export function pageMetadata(page: PublicPage | null, path: string): Metadata {
  if (!page) return { robots: { index: false } };
  const description = (page.seoDesc ?? richTextToPlain(page.content)).slice(
    0,
    160,
  );
  return {
    title: page.seoTitle ?? page.title,
    description,
    alternates: { canonical: path },
    openGraph: { title: page.seoTitle ?? page.title, description },
  };
}

/** Content page (design §7.7): display-lg title, body in text-body, max 68ch. */
export function ContentPage({
  page,
  children,
}: {
  page: PublicPage;
  children?: React.ReactNode;
}) {
  return (
    <article className="site-container flex flex-col gap-8 py-12 md:py-20">
      <h1 className="type-display-lg">{page.title}</h1>
      <RichText
        source={page.content}
        className="max-w-[68ch] type-text-body text-muted-foreground"
      />
      {children}
    </article>
  );
}

export function ContentPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className="site-container flex flex-col gap-6 py-12 md:py-20"
    >
      <div className="skeleton h-12 w-2/3 max-w-md" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-4 w-full max-w-[68ch]" />
      ))}
    </div>
  );
}
