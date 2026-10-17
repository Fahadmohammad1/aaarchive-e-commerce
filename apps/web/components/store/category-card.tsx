import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { HomeCategory } from "@/lib/content/home-fixtures";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";
import { Tag } from "./tag";

// Category card (design §5.6). Shows the product count — never stock.
export function CategoryCard({
  category,
  featured = false,
  className,
}: {
  category: HomeCategory;
  featured?: boolean;
  className?: string;
}) {
  const t = getMessages();
  return (
    <Link
      href={`/category/${category.slug}`}
      className={cn("group/card flex flex-col gap-2", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-sunken",
          featured ? "aspect-[3/4] lg:aspect-[3/5]" : "aspect-[3/4]",
        )}
      >
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="(min-width: 1024px) 25vw, 66vw"
          quality={60}
          className="object-cover transition-transform duration-400 ease-editorial group-hover/card:scale-[1.03]"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Tag>{category.name}</Tag>
        <Tag tone="outline">
          {format(t.product.items, { count: category.productCount })}
        </Tag>
      </div>
      {featured && (
        <div className="flex items-center justify-between">
          <h3 className="type-display-sm">{category.name}</h3>
          <ArrowUpRight aria-hidden strokeWidth={1.25} className="size-5" />
        </div>
      )}
    </Link>
  );
}
