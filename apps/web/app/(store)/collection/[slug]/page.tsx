import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingHeader } from "@/components/store/listing/listing-header";
import {
  ProductListing,
  ProductListingSkeleton,
} from "@/components/store/listing/product-listing";
import { getStoreCollections } from "@/lib/collection/collection-store-api";
import { getMessages } from "@/lib/i18n/i18n";
import { parseListingParams } from "@/lib/product/listing-params";

type Props = PageProps<"/collection/[slug]">;

async function findCollection(slug: string) {
  return (await getStoreCollections()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await findCollection(slug);
  if (!collection) return { title: getMessages().notFound.title };
  return {
    title: collection.name,
    description: collection.description ?? undefined,
    alternates: { canonical: `/collection/${collection.slug}` },
    openGraph: collection.image
      ? {
          images: [
            { url: collection.image.media.url, alt: collection.image.alt },
          ],
        }
      : undefined,
  };
}

async function CollectionListing({ params, searchParams }: Props) {
  const t = getMessages().listing;
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const collection = await findCollection(slug);
  if (!collection) notFound();
  return (
    <>
      <ListingHeader
        title={collection.name}
        intro={collection.description}
        crumbs={[
          { name: t.shopTitle, href: "/shop" },
          { name: collection.name, href: `/collection/${collection.slug}` },
        ]}
      />
      <ProductListing
        scope={{ collection: collection.slug }}
        filters={parseListingParams(query)}
        basePath={`/collection/${collection.slug}`}
      />
    </>
  );
}

// Collection listing (PRD §5.3). Hidden collections are not returned, so they 404.
export default function CollectionPage(props: Props) {
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
        <CollectionListing {...props} />
      </Suspense>
    </div>
  );
}
