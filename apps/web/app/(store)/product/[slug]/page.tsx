import { formatTaka } from "@aaarchive/shared/money";
import { richTextToPlain } from "@aaarchive/shared/rich-text";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { siteUrl } from "@/components/store/json-ld";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/store/product-grid";
import { RichText } from "@/components/store/rich-text";
import { Tag } from "@/components/store/tag";
import { format, getMessages } from "@/lib/i18n/i18n";
import {
  getStoreProduct,
  getStoreProducts,
} from "@/lib/product/product-store-api";
import type { StoreProduct } from "@/lib/product/product-store-schemas";
import { ProductGallery } from "./_components/product-gallery";
import {
  ProductPurchase,
  ProductPurchaseSkeleton,
} from "./_components/product-purchase";
import { ProductSelectionProvider } from "./_components/product-selection";
import { ShareLinks } from "./_components/share-links";

type Props = PageProps<"/product/[slug]">;

function describe(product: StoreProduct): string | undefined {
  const text =
    product.seo.description ??
    product.shortDesc ??
    richTextToPlain(product.description);
  return text ? text.slice(0, 160) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return { title: getMessages().notFound.title };
  const image = product.images[0];
  const description = describe(product);
  return {
    title: product.seo.title ?? product.name,
    // Left out when empty, so Settings → SEO's default description applies.
    ...(description ? { description } : {}),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.seo.title ?? product.name,
      ...(description ? { description } : {}),
      images: image
        ? [{ url: image.media.url, alt: image.alt || product.name }]
        : undefined,
    },
  };
}

function PriceBlock({ product }: { product: StoreProduct }) {
  const t = getMessages();
  const onSale =
    product.compareAt !== null && product.compareAt > product.price;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="type-display-sm">{formatTaka(product.price)}</span>
      {onSale && product.compareAt && (
        <>
          <s className="text-subtle type-mono-label">
            <span className="sr-only">{t.product.originalPrice} </span>
            {formatTaka(product.compareAt)}
          </s>
          <Tag tone="sale">
            {format(t.product.sale, {
              percent: Math.round(
                (1 - product.price / product.compareAt) * 100,
              ),
            })}
          </Tag>
        </>
      )}
      {product.saleEndsAt && (
        <span className="text-muted-foreground type-mono-micro">
          {format(t.pdp.saleEnds, {
            date: new Date(product.saleEndsAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              timeZone: "Asia/Dhaka",
            }),
          })}
        </span>
      )}
    </div>
  );
}

/** Description · Fabric & care, on hairlines (design §7.2). */
function Details({ product }: { product: StoreProduct }) {
  const t = getMessages().pdp;
  const rows = [
    product.description && {
      title: t.description,
      body: (
        <RichText
          source={product.description}
          className="type-text-body text-muted-foreground"
        />
      ),
    },
    (product.fabric || product.gsm || product.care) && {
      title: t.fabricCare,
      body: (
        <dl className="flex flex-col gap-2 type-text-body text-muted-foreground">
          {(product.fabric || product.gsm) && (
            <div>
              <dt className="sr-only">{t.fabric}</dt>
              <dd>
                {[
                  product.fabric,
                  product.gsm && format(t.gsm, { gsm: product.gsm }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          )}
          {product.care && (
            <div>
              <dt className="type-mono-label text-foreground uppercase">
                {t.care}
              </dt>
              <dd className="whitespace-pre-line">{product.care}</dd>
            </div>
          )}
        </dl>
      ),
    },
  ].filter(Boolean) as Array<{ title: string; body: React.ReactNode }>;
  if (rows.length === 0) return null;
  return (
    <div className="border-t">
      {rows.map((row, i) => (
        <details key={row.title} open={i === 0} className="group border-b py-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between type-mono-label uppercase">
            {row.title}
            <span
              aria-hidden
              className="text-muted-foreground transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="pt-2">{row.body}</div>
        </details>
      ))}
    </div>
  );
}

async function Related({ product }: { product: StoreProduct }) {
  const related = await getStoreProducts({
    category: product.category.slug,
    exclude: product.slug,
    limit: 4,
  });
  if (related.data.length === 0) return null;
  return <ProductGrid products={related.data} />;
}

async function ProductView({ params }: Props) {
  const t = getMessages();
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();

  return (
    <ProductSelectionProvider initialColorId={product.colors[0]?.id ?? null}>
      <div className="site-container pt-4 pb-24 md:pt-8">
        <Breadcrumbs
          items={[
            {
              name: product.category.name,
              href: `/category/${product.category.slug}`,
            },
            { name: product.name, href: `/product/${product.slug}` },
          ]}
        />
        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-5 lg:self-start">
            <div className="flex flex-col gap-3">
              <Tag className="w-fit">{product.category.name}</Tag>
              <h1 className="type-display-md">{product.name}</h1>
              <PriceBlock product={product} />
              {product.shortDesc && (
                <p className="text-muted-foreground type-mono-body">
                  {product.shortDesc}
                </p>
              )}
            </div>
            <Suspense fallback={<ProductPurchaseSkeleton />}>
              <ProductPurchase product={product} />
            </Suspense>
            <Details product={product} />
            <ShareLinks
              url={siteUrl(`/product/${product.slug}`)}
              title={product.name}
            />
          </div>
        </div>

        <section aria-labelledby="related-title" className="mt-20">
          <h2 id="related-title" className="mb-6 border-b pb-3 type-display-sm">
            {t.pdp.related}
          </h2>
          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            <Related product={product} />
          </Suspense>
        </section>
      </div>
    </ProductSelectionProvider>
  );
}

function ProductSkeleton() {
  return (
    <div className="site-container pt-4 pb-24 md:pt-8">
      <div className="skeleton h-3 w-48" />
      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="skeleton aspect-[4/5] lg:col-span-7" />
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="skeleton h-5 w-20" />
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-6 w-28" />
          <ProductPurchaseSkeleton />
        </div>
      </div>
    </div>
  );
}

// Product details (PRD §5.5, design §7.2). Cached shell; stock status is the
// only request-time part.
export default function ProductPage(props: Props) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductView {...props} />
    </Suspense>
  );
}
