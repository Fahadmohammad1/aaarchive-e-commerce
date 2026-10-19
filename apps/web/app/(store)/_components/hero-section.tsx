import Link from "next/link";
import { IndexMarkers } from "@/components/store/index-markers";
import { KanthaDivider } from "@/components/store/kantha-divider";
import { MediaImage } from "@/components/store/media-image";
import { Tag } from "@/components/store/tag";
import { Wordmark } from "@/components/store/wordmark";
import type { HomeContent } from "@/lib/content/content-store-schemas";

type Hero = NonNullable<HomeContent["hero"]>;

// Hero (design §6.2, PRD H1). Content → Home → Hero.
export function HeroSection({ hero }: { hero: Hero }) {
  const [left, right] = hero.sideImages;
  return (
    <section className="relative overflow-hidden">
      <Wordmark className="pointer-events-none absolute inset-x-0 top-2 md:top-0" />

      <div className="site-container relative pt-[9vw] md:pt-[6vw]">
        <div className="relative mx-auto grid grid-cols-[1fr_minmax(0,28rem)_1fr] items-start gap-3 md:gap-6">
          <div className="relative mt-[14%] hidden aspect-[3/4] w-[52%] justify-self-end overflow-hidden bg-sunken md:block">
            {left && (
              <MediaImage
                media={left.media}
                alt={left.alt}
                fill
                sizes="12vw"
                className="object-cover"
              />
            )}
          </div>

          {/* main image with ember spotlight behind */}
          <div className="relative isolate col-span-3 md:col-span-1">
            <div
              aria-hidden
              className="spotlight absolute -inset-[30%] -z-10"
            />
            <div className="relative aspect-[4/5] overflow-hidden bg-sunken">
              <MediaImage
                media={hero.mainImage.media}
                alt={hero.mainImage.alt}
                fill
                priority
                sizes="(min-width: 768px) 28rem, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="relative mt-[4%] hidden aspect-[3/4] w-[52%] overflow-hidden bg-sunken md:block">
            {right && (
              <MediaImage
                media={right.media}
                alt={right.alt}
                fill
                sizes="12vw"
                className="object-cover"
              />
            )}
          </div>
        </div>

        <IndexMarkers className="pointer-events-none absolute inset-x-4 top-[58%] hidden md:flex lg:inset-x-10" />

        <div className="flex flex-col items-center gap-5 pt-6 pb-12 text-center md:pt-8 md:pb-16">
          {hero.audiences.length > 0 && (
            <ul className="flex gap-2">
              {hero.audiences.map((a) => (
                <li key={a.label}>
                  <Tag asChild className="h-6 px-3 hover:bg-primary-hover">
                    <Link href={a.href}>{a.label}</Link>
                  </Tag>
                </li>
              ))}
            </ul>
          )}
          <h1 className="type-display-xl">
            {hero.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
        </div>
      </div>

      <KanthaDivider />
    </section>
  );
}
