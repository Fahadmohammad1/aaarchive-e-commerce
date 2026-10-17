import { formatTaka } from "@aaarchive/shared/money";
import Image from "next/image";
import Link from "next/link";
import type { HomeProduct } from "@/lib/content/home-fixtures";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";
import { Tag } from "./tag";

// Product card (design §5.5). The whole card is one link. Shows a status, never
// a stock number (PRD §5.6).
type ProductCardProps = {
  product: HomeProduct;
  sizes: string;
  aspect?: "portrait" | "large";
  showName?: boolean;
  className?: string;
};

export function ProductCard({
  product,
  sizes,
  aspect = "portrait",
  showName = true,
  className,
}: ProductCardProps) {
  const t = getMessages();
  const outOfStock = product.status === "out_of_stock";
  const onSale = product.salePrice !== undefined;
  const salePercent = onSale
    ? Math.round((1 - (product.salePrice ?? 0) / product.price) * 100)
    : 0;

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
        <Image
          src={product.image}
          alt={`${product.name} — ${product.colors[0]?.name ?? ""}`}
          fill
          sizes={sizes}
          quality={60}
          className={cn(
            "object-cover transition-[transform,opacity] duration-400 ease-editorial group-hover/card:scale-[1.03]",
            outOfStock && "opacity-50",
            product.hoverImage && "md:group-hover/card:opacity-0",
          )}
        />
        {product.hoverImage && (
          <Image
            src={product.hoverImage}
            alt=""
            fill
            sizes={sizes}
            quality={60}
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
        <Tag>{product.category}</Tag>
        <span className="flex items-center gap-1.5">
          {onSale && (
            <s className="text-subtle type-mono-label">
              <span className="sr-only">{t.product.originalPrice} </span>
              {formatTaka(product.price)}
            </s>
          )}
          <Tag>{formatTaka(product.salePrice ?? product.price)}</Tag>
        </span>
      </div>
      {showName && (
        <h3 className="line-clamp-2 type-display-sm">{product.name}</h3>
      )}
    </Link>
  );
}
