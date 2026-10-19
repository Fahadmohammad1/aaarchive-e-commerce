import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RichText } from "@/components/store/rich-text";
import { getStoreFaq } from "@/lib/content/content-store-api";
import { getMessages } from "@/lib/i18n/i18n";
import { ContentPageSkeleton } from "../_components/content-page";

const t = getMessages().faq;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: { canonical: "/faq" },
};

async function FaqList() {
  await connection();
  const items = await getStoreFaq();
  if (items.length === 0) {
    return <p className="text-muted-foreground type-mono-label">{t.empty}</p>;
  }
  return (
    <div className="max-w-3xl border-t">
      {items.map((item) => (
        <details key={item.id} className="group border-b">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 type-display-sm">
            {item.question}
            <span
              aria-hidden
              className="shrink-0 text-primary type-mono-label transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <RichText
            source={item.answer}
            className="max-w-[68ch] pb-5 type-text-body text-muted-foreground"
          />
        </details>
      ))}
    </div>
  );
}

// FAQ (design §7.7): accordion rows on hairlines. Content → FAQ.
export default function FaqPage() {
  return (
    <div className="site-container flex flex-col gap-8 py-12 md:py-20">
      <h1 className="type-display-lg">{t.title}</h1>
      <Suspense fallback={<ContentPageSkeleton />}>
        <FaqList />
      </Suspense>
    </div>
  );
}
