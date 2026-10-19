import { cacheTags } from "@aaarchive/shared/cache-tags";
import {
  CONTENT_KEYS,
  type ContentData,
  type ContentKey,
  contentSchemas,
} from "@aaarchive/shared/content";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import type { RequestUser } from "../../common/auth/request-user.js";
import {
  type StoreGroup,
  storeGroupSelect,
  toStoreGroup,
} from "../../common/catalog/store-groups.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import {
  type StoreProductSummary,
  storeSummaryInclude,
  toStoreProductSummary,
} from "../products/store-products.mapper.js";
import { StoreProductsService } from "../products/store-products.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import {
  collectMediaIds,
  loadMedia,
  type MediaMap,
  type ResolvedImage,
  resolveImage,
} from "./content-media.js";

/** Products per "Latest entries" tab (PRD H4). */
const TAB_LIMIT = 8;

type Stored<K extends ContentKey> = ContentData<K> | null;

export type HomeContent = {
  hero: {
    headline: string[];
    audiences: Array<{ label: string; href: string }>;
    mainImage: ResolvedImage;
    sideImages: ResolvedImage[];
  } | null;
  categories: {
    heading: string[];
    intro: string;
    items: StoreGroup[];
  } | null;
  lookFile: {
    heading: string[];
    label: string;
    intro: string;
    image: ResolvedImage;
    href: string;
    items: Array<{
      code: string | null;
      hotspot: { x: number; y: number };
      product: StoreProductSummary;
    }>;
  } | null;
  latest: {
    heading: string[];
    intro: string;
    tabs: Array<{
      label: string;
      value: string;
      products: StoreProductSummary[];
    }>;
    campaign: {
      tag: string;
      title: string[];
      text: string;
      image: ResolvedImage;
      href: string;
    };
  } | null;
  promises: {
    heading: string[];
    intro: string;
    image: ResolvedImage;
    items: Array<{ icon: string; title: string; text: string }>;
  } | null;
  social: {
    heading: string[];
    intro: string;
    followHref: string;
    posts: Array<{
      id: string;
      image: ResolvedImage;
      label: string;
      platform: string;
      link: string;
    }>;
  } | null;
};

export type SiteContent = {
  /** null when switched off or empty. */
  announcement: string | null;
  navigation: ContentData<"site.navigation"> | null;
  footer: {
    blurb: string;
    image: ResolvedImage | null;
    socials: ContentData<"site.footer">["socials"];
    policyLinks: ContentData<"site.footer">["policyLinks"];
  } | null;
};

/** Which storefront tags a block lives under (PRD §6.7 rule 2). */
function tagsFor(key: ContentKey): string[] {
  return [
    cacheTags.content,
    key.startsWith("site.") ? cacheTags.site : cacheTags.home,
  ];
}

/**
 * Editable storefront content (PRD §6.7, architecture §4.7). Admin writes are
 * validated with `contentSchemas`; public reads resolve references and drop
 * whatever is no longer published.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly store: StoreProductsService,
    private readonly revalidation: RevalidationService,
  ) {}

  private async blocks<K extends ContentKey>(keys: readonly K[]) {
    const rows = await this.prisma.contentBlock.findMany({
      where: { key: { in: [...keys] } },
    });
    const out = new Map<ContentKey, unknown>();
    for (const row of rows) {
      // A row that no longer fits its schema is treated as missing rather
      // than breaking the page.
      const key = row.key as ContentKey;
      const parsed = contentSchemas[key]?.safeParse(row.data);
      if (parsed?.success) out.set(key, parsed.data);
    }
    return <T extends K>(key: T) => (out.get(key) ?? null) as Stored<T>;
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  /**
   * Every block with its data (null = not created yet), plus what the forms
   * need to show previews: the media assets and products it references.
   */
  async adminList() {
    const rows = await this.prisma.contentBlock.findMany({
      include: { updatedBy: { select: { name: true } } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const mediaMap = await loadMedia(
      this.prisma,
      this.media,
      collectMediaIds(rows.map((r) => r.data)),
    );
    const productIds = new Set<string>();
    const look = byKey.get("home.lookFile")?.data as
      | ContentData<"home.lookFile">
      | undefined;
    for (const item of look?.items ?? []) productIds.add(item.productId);
    const products = productIds.size
      ? await this.prisma.product.findMany({
          where: { id: { in: [...productIds] } },
          select: { id: true, name: true, slug: true, status: true },
        })
      : [];
    return {
      blocks: CONTENT_KEYS.map((key) => {
        const row = byKey.get(key);
        return {
          key,
          data: row?.data ?? null,
          updatedAt: row?.updatedAt.toISOString() ?? null,
          updatedBy: row?.updatedBy?.name ?? null,
        };
      }),
      media: Object.fromEntries(mediaMap),
      products: Object.fromEntries(
        products.map((p) => [
          p.id,
          { name: p.name, slug: p.slug, status: p.status },
        ]),
      ),
    };
  }

  async save(key: string, data: unknown, user: RequestUser) {
    if (!(CONTENT_KEYS as string[]).includes(key)) {
      throw new NotFoundException({
        message: "Unknown content section",
        code: "NOT_FOUND",
      });
    }
    const contentKey = key as ContentKey;
    // One schema per key; widened so the union of all of them type-checks.
    const schema: z.ZodType = contentSchemas[contentKey];
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid content",
        code: "VALIDATION_ERROR",
        details: z.flattenError(parsed.error),
      });
    }
    for (const id of collectMediaIds(parsed.data)) {
      await this.media.assertExists(id);
    }
    if (contentKey === "home.lookFile") {
      const ids = (parsed.data as ContentData<"home.lookFile">).items.map(
        (i) => i.productId,
      );
      const found = await this.prisma.product.count({
        where: { id: { in: ids } },
      });
      if (found !== new Set(ids).size) {
        throw new BadRequestException({
          message: "A chosen product no longer exists",
          code: "PRODUCT_NOT_FOUND",
        });
      }
    }
    const value = parsed.data as object;
    const row = await this.prisma.contentBlock.upsert({
      where: { key: contentKey },
      update: { data: value, updatedById: user.id },
      create: { key: contentKey, data: value, updatedById: user.id },
    });
    void this.revalidation.revalidate(tagsFor(contentKey));
    return {
      key: contentKey,
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: user.name,
    };
  }

  // ── Public ───────────────────────────────────────────────────────────────

  async site(): Promise<SiteContent> {
    const get = await this.blocks([
      "site.announcement",
      "site.navigation",
      "site.footer",
    ] as const);
    const announcement = get("site.announcement");
    const footer = get("site.footer");
    const mediaMap = await loadMedia(
      this.prisma,
      this.media,
      collectMediaIds(footer),
    );
    return {
      announcement:
        announcement?.enabled && announcement.text ? announcement.text : null,
      navigation: get("site.navigation"),
      footer: footer
        ? {
            blurb: footer.blurb,
            image: resolveImage(mediaMap, footer.image),
            socials: footer.socials,
            policyLinks: footer.policyLinks,
          }
        : null,
    };
  }

  async home(): Promise<HomeContent> {
    const get = await this.blocks([
      "home.hero",
      "home.categories",
      "home.lookFile",
      "home.latest",
      "home.promises",
      "home.social",
    ] as const);
    const raw = {
      hero: get("home.hero"),
      categories: get("home.categories"),
      lookFile: get("home.lookFile"),
      latest: get("home.latest"),
      promises: get("home.promises"),
      social: get("home.social"),
    };
    const posts = raw.social
      ? await this.prisma.socialPost.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          take: 8,
        })
      : [];
    const mediaMap = await loadMedia(this.prisma, this.media, [
      ...collectMediaIds(Object.values(raw)),
      ...posts.map((p) => p.mediaId),
    ]);

    const [categories, lookFile, latest] = await Promise.all([
      raw.categories ? this.homeCategories(raw.categories) : null,
      raw.lookFile ? this.homeLookFile(raw.lookFile, mediaMap) : null,
      raw.latest ? this.homeLatest(raw.latest, mediaMap) : null,
    ]);

    return {
      hero: this.homeHero(raw.hero, mediaMap),
      categories,
      lookFile,
      latest,
      promises: (() => {
        const p = raw.promises;
        const image = resolveImage(mediaMap, p?.image);
        return p && image
          ? { heading: p.heading, intro: p.intro, image, items: p.items }
          : null;
      })(),
      social: raw.social
        ? {
            heading: raw.social.heading,
            intro: raw.social.intro,
            followHref: raw.social.followHref,
            posts: posts.flatMap((p) => {
              const image = resolveImage(mediaMap, {
                mediaId: p.mediaId,
                alt: p.alt,
              });
              return image
                ? [
                    {
                      id: p.id,
                      image,
                      label: p.label,
                      platform: p.platform,
                      link: p.link,
                    },
                  ]
                : [];
            }),
          }
        : null,
    };
  }

  private homeHero(
    hero: Stored<"home.hero">,
    map: MediaMap,
  ): HomeContent["hero"] {
    const mainImage = resolveImage(map, hero?.mainImage);
    if (!hero || !mainImage) return null;
    return {
      headline: hero.headline,
      audiences: hero.audiences,
      mainImage,
      sideImages: hero.sideImages.flatMap((i) => {
        const img = resolveImage(map, i);
        return img ? [img] : [];
      }),
    };
  }

  /** Categories marked "show on home", in their order, with published counts. */
  private async homeCategories(
    block: ContentData<"home.categories">,
  ): Promise<HomeContent["categories"]> {
    const rows = await this.prisma.category.findMany({
      where: { showOnHome: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        ...storeGroupSelect,
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
    });
    const items = rows.map((r) =>
      toStoreGroup(r, r._count.products, this.media),
    );
    if (items.length === 0) return null;
    return { heading: block.heading, intro: block.intro, items };
  }

  /** Look file pieces: published products only, in the chosen order. */
  private async homeLookFile(
    block: ContentData<"home.lookFile">,
    map: MediaMap,
  ): Promise<HomeContent["lookFile"]> {
    const image = resolveImage(map, block.image);
    if (!image) return null;
    const rows = await this.prisma.product.findMany({
      where: {
        id: { in: block.items.map((i) => i.productId) },
        status: "PUBLISHED",
      },
      include: storeSummaryInclude,
    });
    const byId = new Map(
      rows.map((r) => [r.id, toStoreProductSummary(r, this.media)]),
    );
    const items = block.items.flatMap((item) => {
      const product = byId.get(item.productId);
      return product
        ? [{ code: item.code ?? null, hotspot: item.hotspot, product }]
        : [];
    });
    if (items.length === 0) return null;
    return {
      heading: block.heading,
      label: block.label,
      intro: block.intro,
      image,
      href: block.href,
      items,
    };
  }

  /** Tabs: "new" = newest products; otherwise that category, max 8 each. */
  private async homeLatest(
    block: ContentData<"home.latest">,
    map: MediaMap,
  ): Promise<HomeContent["latest"]> {
    const image = resolveImage(map, block.campaign.image);
    if (!image) return null;
    const tabs = await Promise.all(
      block.tabs.map(async (tab) => {
        const { data } = await this.store.list({
          sort: "newest",
          page: 1,
          limit: TAB_LIMIT,
          ...(tab.value === "new" ? {} : { category: tab.value }),
        });
        return { label: tab.label, value: tab.value, products: data };
      }),
    );
    return {
      heading: block.heading,
      intro: block.intro,
      tabs: tabs.filter((t) => t.products.length > 0),
      campaign: { ...block.campaign, image },
    };
  }
}
