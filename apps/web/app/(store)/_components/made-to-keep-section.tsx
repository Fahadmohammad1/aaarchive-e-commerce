import type { PROMISE_ICONS } from "@aaarchive/shared/content";
import {
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
  Feather,
  Gift,
  type LucideIcon,
  Scale,
  Sun,
  Truck,
} from "lucide-react";
import { ArrowButton } from "@/components/store/arrow-button";
import { KanthaDivider } from "@/components/store/kantha-divider";
import { MediaImage } from "@/components/store/media-image";
import type { HomeContent } from "@/lib/content/content-store-schemas";
import { getMessages } from "@/lib/i18n/i18n";

/** The icon each promise can use (PROMISE_ICONS in @aaarchive/shared/content). */
const ICONS: Record<(typeof PROMISE_ICONS)[number], LucideIcon> = {
  weather: Sun,
  fabric: Scale,
  payment: Banknote,
  exchange: ArrowLeftRight,
  delivery: Truck,
  quality: BadgeCheck,
  comfort: Feather,
  gift: Gift,
};
const iconFor = (name: string) =>
  ICONS[name as keyof typeof ICONS] ?? BadgeCheck;

type Section = NonNullable<HomeContent["promises"]>;

// Made to be kept (design §6.6, PRD H5): a full-width campaign photo with the
// heading and the promises laid over it. Content → Home → Made to be kept.
export function MadeToKeepSection({ section }: { section: Section }) {
  const t = getMessages();
  const madeToKeep = { ...section, labels: section.items };
  return (
    <section>
      <KanthaDivider />
      <div className="relative isolate overflow-hidden">
        <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/10]">
          <MediaImage
            media={madeToKeep.image.media}
            alt={madeToKeep.image.alt}
            fill
            sizes="100vw"
            className="object-cover object-[50%_30%]"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40"
          />
        </div>

        <div className="absolute inset-0">
          <div className="site-container flex h-full flex-col justify-between py-10 md:py-16">
            <div className="flex max-w-xl flex-col items-start gap-5">
              <h2 className="type-display-xl">
                {madeToKeep.heading.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="max-w-[40ch] text-foreground/80 type-mono-body">
                {madeToKeep.intro}
              </p>
              <ArrowButton href="/about">{t.actions.learnMore}</ArrowButton>
            </div>

            <ol className="hidden auto-cols-fr grid-flow-col gap-6 border-t border-line-strong pt-6 lg:grid">
              {madeToKeep.labels.map((label) => {
                const Icon = iconFor(label.icon);
                return (
                  <li key={label.title} className="flex flex-col gap-2">
                    <Icon
                      aria-hidden
                      strokeWidth={1.25}
                      className="size-7 text-primary"
                    />
                    <h3 className="type-display-sm">{label.title}</h3>
                    <p className="text-foreground/75 type-mono-body">
                      {label.text}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* below lg the promises sit under the photo */}
      <ol className="site-container grid gap-x-4 gap-y-8 py-10 sm:grid-cols-2 lg:hidden">
        {madeToKeep.labels.map((label) => {
          const Icon = iconFor(label.icon);
          return (
            <li key={label.title} className="flex gap-4">
              <Icon
                aria-hidden
                strokeWidth={1.25}
                className="size-7 shrink-0 text-primary"
              />
              <div className="flex flex-col gap-1.5">
                <h3 className="type-display-sm">{label.title}</h3>
                <p className="text-muted-foreground type-mono-body">
                  {label.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
