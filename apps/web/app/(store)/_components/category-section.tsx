import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ArrowButton } from "@/components/store/arrow-button";
import { SectionHeading } from "@/components/store/section-heading";
import { Tag } from "@/components/store/tag";
import { categories, categoriesIntro } from "@/lib/content/home-fixtures";
import { format, getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";

// Bento placement, in category order. Desktop: 4 columns × 3 rows, every cell
// filled. Mobile: 2 columns, first and last tiles full width.
const TILES = [
  "col-span-2 row-span-2", // lead
  "",
  "lg:row-span-2", // tall
  "",
  "lg:col-span-2",
  "col-span-2",
];

// The archive index (design §6.3, PRD H2): categories as an editorial bento of
// photographs, name over image. Product counts, never stock.
export function CategorySection() {
  const t = getMessages();
  return (
    <section id="categories" className="site-container py-16 md:py-24 lg:py-32">
      <SectionHeading
        lines={categoriesIntro.heading}
        intro={categoriesIntro.intro}
        className="mb-8 md:mb-12"
      />
      <ul className="grid auto-rows-[13rem] grid-cols-2 gap-2 md:auto-rows-[15rem] lg:grid-cols-4 lg:auto-rows-[17rem] lg:gap-3">
        {categories.map((category, i) => {
          const lead = i === 0;
          return (
            <li key={category.slug} className={cn(TILES[i])}>
              <Link
                href={`/category/${category.slug}`}
                className="group/tile relative block h-full overflow-hidden bg-sunken"
              >
                <Image
                  src={category.image}
                  alt=""
                  fill
                  sizes={
                    lead
                      ? "(min-width: 1024px) 50vw, 100vw"
                      : "(min-width: 1024px) 25vw, 50vw"
                  }
                  quality={60}
                  className="object-cover transition-transform duration-700 ease-editorial group-hover/tile:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
                />
                <span
                  aria-hidden
                  className="absolute top-3 right-3 grid size-9 translate-y-1 place-items-center bg-primary text-primary-foreground opacity-0 transition-all duration-200 ease-editorial group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
                >
                  <ArrowUpRight strokeWidth={1.5} className="size-5" />
                </span>
                <Tag
                  tone="outline"
                  className="absolute top-3 left-3 bg-background/60 backdrop-blur-sm"
                >
                  {format(t.product.items, { count: category.productCount })}
                </Tag>
                <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 md:inset-x-4 md:bottom-4">
                  <span className="flex flex-col gap-1">
                    <span
                      aria-hidden
                      className="text-muted-foreground type-mono-micro"
                    >
                      {`// ${String(i + 1).padStart(2, "0")}`}
                    </span>
                    <span
                      className={
                        lead
                          ? "type-display-lg"
                          : "type-display-sm sm:type-display-md"
                      }
                    >
                      {category.name}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-8">
        <ArrowButton href="/shop">{t.actions.browseAll}</ArrowButton>
      </div>
    </section>
  );
}
