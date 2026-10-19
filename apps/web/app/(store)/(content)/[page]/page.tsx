import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStorePage } from "@/lib/content/content-store-api";
import {
  ContentPage,
  ContentPageSkeleton,
  pageMetadata,
} from "../_components/content-page";

// Top-level content pages: /about and /size-guide (PRD §5.11). Contact and
// FAQ have their own routes; every other page lives under /policies/.
// A dynamic segment, so no page is fetched at build time.
const TOP_LEVEL = new Set(["about", "size-guide"]);

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page: slug } = await params;
  if (!TOP_LEVEL.has(slug)) return { robots: { index: false } };
  return pageMetadata(await getStorePage(slug), `/${slug}`);
}

async function PageView({ params }: Props) {
  const { page: slug } = await params;
  const page = TOP_LEVEL.has(slug) ? await getStorePage(slug) : null;
  if (!page) notFound();
  return <ContentPage page={page} />;
}

export default function TopLevelContentPage(props: Props) {
  return (
    <Suspense fallback={<ContentPageSkeleton />}>
      <PageView {...props} />
    </Suspense>
  );
}
