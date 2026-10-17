import Image from "next/image";
import { ArrowButton } from "@/components/store/arrow-button";
import { ProductCard } from "@/components/store/product-card";
import { SectionHeading } from "@/components/store/section-heading";
import { Tag } from "@/components/store/tag";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  collectionsIntro,
  collectionTabs,
  type HomeProduct,
  latestCampaign,
  products,
} from "@/lib/content/home-fixtures";
import { getMessages } from "@/lib/i18n/i18n";

function productsFor(tab: string): HomeProduct[] {
  const list =
    tab === "new"
      ? products.filter((p) => p.isNew)
      : products.filter((p) => p.categorySlug === tab);
  return list.slice(0, 8); // PRD H4: max 8 per tab
}

// Campaign tile: a 2×2 editorial image that leads the grid.
function CampaignTile() {
  const t = getMessages();
  return (
    <li className="relative col-span-2 min-h-[28rem] overflow-hidden bg-sunken md:row-span-2">
      <Image
        src={latestCampaign.image}
        alt=""
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        quality={75}
        className="object-cover"
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"
      />
      <div className="absolute inset-x-4 bottom-4 flex flex-col items-start gap-4 md:inset-x-6 md:bottom-6">
        <Tag>{latestCampaign.tag}</Tag>
        <p className="type-display-xl">
          {latestCampaign.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
        <p className="max-w-[36ch] text-muted-foreground type-mono-body">
          {latestCampaign.text}
        </p>
        <ArrowButton href={latestCampaign.href}>
          {t.actions.shopTheDrop}
        </ArrowButton>
      </div>
    </li>
  );
}

function EntryGrid({ items }: { items: HomeProduct[] }) {
  return (
    <ul className="grid grid-flow-dense grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      <CampaignTile />
      {items.map((product) => (
        <li key={product.slug}>
          <ProductCard
            product={product}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
        </li>
      ))}
    </ul>
  );
}

// Latest entries (design §6.5, PRD H4).
export function CollectionsSection() {
  const t = getMessages();
  return (
    <section className="site-container py-16 md:py-24 lg:py-32">
      <div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          lines={collectionsIntro.heading}
          intro={collectionsIntro.intro}
          align="stack"
        />
        <ArrowButton href="/shop" className="self-start md:self-end">
          {t.actions.browseMore}
        </ArrowButton>
      </div>

      <Tabs defaultValue="new" className="gap-8">
        <TabsList
          aria-label={t.product.filter}
          className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 scrollbar-none"
        >
          {collectionTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-7 flex-none border-line-strong px-3 type-mono-label text-muted-foreground hover:border-foreground data-active:border-primary data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-primary dark:data-active:bg-primary dark:data-active:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {collectionTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <EntryGrid items={productsFor(tab.value)} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
