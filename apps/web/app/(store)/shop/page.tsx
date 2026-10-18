import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingHeader } from "@/components/store/listing/listing-header";
import {
  ProductListing,
  ProductListingSkeleton,
} from "@/components/store/listing/product-listing";
import { getMessages } from "@/lib/i18n/i18n";
import { parseListingParams } from "@/lib/product/listing-params";

const t = getMessages().listing;

export const metadata: Metadata = {
  title: t.shopTitle,
  description: t.shopIntro,
  alternates: { canonical: "/shop" },
};

async function Listing({ searchParams }: PageProps<"/shop">) {
  const filters = parseListingParams(await searchParams);
  return <ProductListing scope={{}} filters={filters} basePath="/shop" />;
}

// Shop all (PRD §5.3). The header is static; the list depends on the URL.
export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <div className="site-container pb-20">
      <ListingHeader
        title={t.shopTitle}
        intro={t.shopIntro}
        crumbs={[{ name: t.shopTitle, href: "/shop" }]}
      />
      <Suspense fallback={<ProductListingSkeleton />}>
        <Listing {...props} />
      </Suspense>
    </div>
  );
}
