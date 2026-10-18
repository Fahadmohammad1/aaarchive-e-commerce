import type { MediaAsset } from "@aaarchive/shared/media";
import { formatTaka } from "@aaarchive/shared/money";
import Image from "next/image";
import Link from "next/link";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";
import { MediaImage } from "./media-image";
import { Tag } from "./tag";

// Product card (design §5.5). The whole card is one link. Shows a status, never
// a stock number (PRD §5.6).

/** An uploaded image (API) or, until Phase 6, a home-fixture URL. */
export type CardImage =
  | { media: MediaAsset; alt: string }
  | { src: string; alt: string };

/** What a card needs: the API's StoreProductSummary fits as is. */
export type CardProduct = {
  slug: string;
  name: string;
  category: { name: string };
  price: number;
  compareAt: number | null;
  image: CardImage | null;
  hoverImage: CardImage | null;
  stockStatus: "in_stock" | "out_of_stock";
};

type ProductCardProps = {
  product: CardProduct;
  sizes: string;
  aspect?: "portrait" | "large";
  showName?: boolean;
  /** Above-the-fold cards (first row of a listing): load eagerly. */
  priority?: boolean;
  className?: string;
};

function CardPicture({
  image,
  sizes,
  priority,
  className,
}: {
  image: CardImage;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if ("media" in image) {
    return (
      <MediaImage
        media={image.media}
        alt={image.alt}
        sizes={sizes}
        fill
        priority={priority}
        className={className}
      />
    );
  }
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      quality={60}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}

export function ProductCard({
  product,
  sizes,
  aspect = "portrait",
  showName = true,
  priority = false,
  className,
}: ProductCardProps) {
  const t = getMessages();
  const outOfStock = product.stockStatus === "out_of_stock";
  const onSale =
    product.compareAt !== null && product.compareAt > product.price;
  const salePercent = onSale
    ? Math.round(
        (1 - product.price / (product.compareAt ?? product.price)) * 100,
      )
    : 0;
  const hover = product.hoverImage;

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn("group/card flex flex-col gap-2", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-sunken",
          aspect === "portrait" && "aspect-[3/4]",
          aspect === "large" && "aspect-[4/5]",
        )}
      >
        {product.image && (
          <CardPicture
            image={{ ...product.image, alt: product.image.alt || product.name }}
            sizes={sizes}
            priority={priority}
            className={cn(
              "object-cover transition-[transform,opacity] duration-400 ease-editorial group-hover/card:scale-[1.03]",
              outOfStock && "opacity-50",
              hover && "md:group-hover/card:opacity-0",
            )}
          />
        )}
        {hover && (
          <CardPicture
            image={{ ...hover, alt: "" }}
            sizes={sizes}
            className="hidden object-cover opacity-0 transition-[transform,opacity] duration-400 ease-editorial group-hover/card:scale-[1.03] group-hover/card:opacity-100 md:block"
          />
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {outOfStock && <Tag tone="stock-out">{t.product.outOfStock}</Tag>}
          {onSale && !outOfStock && (
            <Tag tone="sale">
              {format(t.product.sale, { percent: salePercent })}
            </Tag>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Tag>{product.category.name}</Tag>
        <span className="flex items-center gap-1.5">
          {onSale && (
            <s className="text-subtle type-mono-label">
              <span className="sr-only">{t.product.originalPrice} </span>
              {formatTaka(product.compareAt ?? product.price)}
            </s>
          )}
          <Tag>{formatTaka(product.price)}</Tag>
        </span>
      </div>
      {showName && (
        <h3 className="line-clamp-2 type-display-sm">{product.name}</h3>
      )}
    </Link>
  );
}

/** Placeholder with the card's exact shape (no layout shift, design §7.8). */
export function ProductCardSkeleton({
  showName = true,
}: {
  showName?: boolean;
}) {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="skeleton aspect-[3/4]" />
      <div className="flex justify-between">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-5 w-16" />
      </div>
      {showName && <div className="skeleton h-4 w-3/4" />}
    </div>
  );
}
