import {
  type CardProduct,
  ProductCard,
  ProductCardSkeleton,
} from "./product-card";

const SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

/** Listing grid (design §7.1): 2 / 3 / 4 columns, regular for scanning. */
export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: CardProduct[];
  /** The first row's images load eagerly (LCP). */
  priorityCount?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {products.map((product, i) => (
        <li key={product.slug}>
          <ProductCard
            product={product}
            sizes={SIZES}
            priority={i < priorityCount}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      aria-busy="true"
      className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5"
    >
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
