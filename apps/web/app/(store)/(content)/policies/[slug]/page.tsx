import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStorePage } from "@/lib/content/content-store-api";
import {
  ContentPage,
  ContentPageSkeleton,
  pageMetadata,
} from "../../_components/content-page";

// Policies (delivery, returns, privacy, terms…), any page from Content →
// Pages whose address is not a fixed one (PRD §5.11).
const FIXED = new Set(["about", "contact", "size-guide"]);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (FIXED.has(slug)) return { robots: { index: false } };
  return pageMetadata(await getStorePage(slug), `/policies/${slug}`);
}

async function PolicyView({ params }: Props) {
  const { slug } = await params;
  const page = FIXED.has(slug) ? null : await getStorePage(slug);
  if (!page) notFound();
  return <ContentPage page={page} />;
}

export default function PolicyPage(props: Props) {
  return (
    <Suspense fallback={<ContentPageSkeleton />}>
      <PolicyView {...props} />
    </Suspense>
  );
}
