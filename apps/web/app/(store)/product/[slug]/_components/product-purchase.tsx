import { JsonLd, siteUrl } from "@/components/store/json-ld";
import { getStoreProductStock } from "@/lib/product/product-store-api";
import type {
  StoreProduct,
  StoreProductStock,
} from "@/lib/product/product-store-schemas";
import { VariantPicker } from "./variant-picker";

/**
 * The request-time hole of the product page (PRD §8.2): reads the current
 * stock *status* (never cached, never a number) and renders the picker plus
 * the Product structured data with today's availability.
 */
export async function ProductPurchase({ product }: { product: StoreProduct }) {
  let stock: StoreProductStock | null = null;
  try {
    stock = await getStoreProductStock(product.slug);
  } catch {
    stock = null; // the picker shows "could not check availability"
  }
  const available =
    stock?.variants.some((v) => v.stockStatus !== "out_of_stock") ?? false;
  const prices = product.variants.map((v) => v.price);
  const url = siteUrl(`/product/${product.slug}`);

  return (
    <>
      <VariantPicker product={product} stock={stock} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description:
            product.seo.description ?? product.shortDesc ?? undefined,
          image: product.images.slice(0, 4).map((i) => i.media.url),
          brand: { "@type": "Brand", name: "Aaarchive" },
          category: product.category.name,
          url,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BDT",
            lowPrice: Math.min(product.price, ...prices),
            highPrice: Math.max(product.price, ...prices),
            offerCount: product.variants.length,
            availability: available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url,
          },
        }}
      />
    </>
  );
}

export function ProductPurchaseSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="skeleton h-4 w-32" />
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton size-11 rounded-full" />
        ))}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton size-11" />
        ))}
      </div>
      <div className="skeleton h-11 w-40" />
      <div className="skeleton h-11 w-full" />
      <div className="skeleton h-11 w-full" />
    </div>
  );
}
