import { formatTaka } from "@aaarchive/shared/money";
import Image from "next/image";
import Link from "next/link";
import { ArrowButton } from "@/components/store/arrow-button";
import { SectionHeading } from "@/components/store/section-heading";
import { Tag } from "@/components/store/tag";
import { lookFile } from "@/lib/content/home-fixtures";
import { format, getMessages } from "@/lib/i18n/i18n";

// Look file (design §6.4, PRD H3): an editorial photo with numbered
// shop-the-look hotspots, and the pieces as image cards beside it.
export function LookFileSection() {
  const t = getMessages();
  const total = lookFile.items.reduce((sum, item) => sum + item.price, 0);

  return (
    <section className="relative overflow-hidden bg-sunken">
      <div
        aria-hidden
        className="spotlight absolute -top-1/4 -left-1/4 size-[70vw] opacity-60"
      />
      <div className="site-container relative grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-32">
        <div className="relative lg:col-span-7">
          <div className="relative aspect-[4/5] overflow-hidden bg-background md:aspect-[5/6]">
            <Image
              src={lookFile.image}
              alt="Look file No. 01: black logo sweatshirt with a corduroy bucket hat"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              quality={75}
              className="object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent"
            />
            {lookFile.items.map((item, i) => (
              <Link
                key={item.slug}
                href={`/product/${item.slug}`}
                aria-label={format(t.actions.shopPiece, { name: item.name })}
                style={{
                  left: `${item.hotspot.x}%`,
                  top: `${item.hotspot.y}%`,
                }}
                className="group/spot absolute -translate-x-1/2 -translate-y-1/2"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping bg-primary/50"
                />
                <span className="relative grid size-8 place-items-center bg-primary text-primary-foreground type-mono-label">
                  {i + 1}
                </span>
                <span className="pointer-events-none absolute top-1/2 left-full ml-2 hidden -translate-y-1/2 whitespace-nowrap bg-background/90 px-2 py-1 type-mono-label opacity-0 backdrop-blur-sm transition-opacity group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100 md:block">
                  {item.name} · {formatTaka(item.price)}
                </span>
              </Link>
            ))}
            <Tag className="absolute top-4 left-4">{lookFile.label}</Tag>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:col-span-5">
          <SectionHeading
            lines={lookFile.heading}
            intro={lookFile.intro}
            align="stack"
          />

          <ul className="grid grid-cols-3 gap-2 md:gap-3">
            {lookFile.items.map((item, i) => (
              <li key={item.slug}>
                <Link
                  href={`/product/${item.slug}`}
                  className="group/piece flex flex-col gap-2"
                >
                  <span className="relative aspect-[3/4] overflow-hidden bg-background">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1024px) 12vw, 30vw"
                      quality={60}
                      className="object-cover transition-transform duration-400 ease-editorial group-hover/piece:scale-105"
                    />
                    <span className="absolute top-1.5 left-1.5 grid size-6 place-items-center bg-primary text-primary-foreground type-mono-micro">
                      {i + 1}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[0.6875rem] leading-tight font-display uppercase md:text-xs group-hover/piece:text-primary">
                    {item.name}
                  </span>
                  <span className="type-mono-label">
                    {formatTaka(item.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <p className="flex items-baseline gap-3">
              <span className="text-muted-foreground type-mono-label uppercase">
                {t.look.total}
              </span>
              <span className="type-display-md">{formatTaka(total)}</span>
            </p>
            <ArrowButton href="/collection/archive-01-winter-drop">
              {t.actions.shopTheLook}
            </ArrowButton>
          </div>
        </div>
      </div>
    </section>
  );
}
