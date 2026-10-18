import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingHeader } from "@/components/store/listing/listing-header";
import {
  ProductListing,
  ProductListingSkeleton,
} from "@/components/store/listing/product-listing";
import { getStoreCategories } from "@/lib/category/category-store-api";
import { getMessages } from "@/lib/i18n/i18n";
import { parseListingParams } from "@/lib/product/listing-params";

type Props = PageProps<"/category/[slug]">;

async function findCategory(slug: string) {
  return (await getStoreCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: getMessages().notFound.title };
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: category.image
      ? { images: [{ url: category.image.media.url, alt: category.image.alt }] }
      : undefined,
  };
}

async function CategoryListing({ params, searchParams }: Props) {
  const t = getMessages().listing;
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);
  if (!category) notFound();
  return (
    <>
      <ListingHeader
        title={category.name}
        intro={category.description}
        crumbs={[
          { name: t.shopTitle, href: "/shop" },
          { name: category.name, href: `/category/${category.slug}` },
        ]}
      />
      <ProductListing
        scope={{ category: category.slug }}
        filters={parseListingParams(query)}
        basePath={`/category/${category.slug}`}
      />
    </>
  );
}

// Category listing (PRD §5.3).
export default function CategoryPage(props: Props) {
  return (
    <div className="site-container pb-20">
      <Suspense
        fallback={
          <div className="pt-10">
            <div className="skeleton mb-8 h-14 w-2/3 max-w-md" />
            <ProductListingSkeleton />
          </div>
        }
      >
        <CategoryListing {...props} />
      </Suspense>
    </div>
  );
}
