import { ArrowLeftRight, Banknote, Scale, Sun } from "lucide-react";
import Image from "next/image";
import { ArrowButton } from "@/components/store/arrow-button";
import { KanthaDivider } from "@/components/store/kantha-divider";
import { madeToKeep } from "@/lib/content/home-fixtures";
import { getMessages } from "@/lib/i18n/i18n";

const ICONS = {
  weather: Sun,
  fabric: Scale,
  payment: Banknote,
  exchange: ArrowLeftRight,
} as const;

// Made to be kept (design §6.6, PRD H5): a full-width campaign photo with the
// heading and the four promises laid over it.
export function MadeToKeepSection() {
  const t = getMessages();
  return (
    <section>
      <KanthaDivider />
      <div className="relative isolate overflow-hidden">
        <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/10]">
          <Image
            src={madeToKeep.image}
            alt="Model in a black leather jacket against a brick wall"
            fill
            sizes="100vw"
            quality={75}
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

            <ol className="hidden grid-cols-4 gap-6 border-t border-line-strong pt-6 lg:grid">
              {madeToKeep.labels.map((label) => {
                const Icon = ICONS[label.icon];
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
          const Icon = ICONS[label.icon];
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
