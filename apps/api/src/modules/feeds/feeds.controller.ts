import { Controller, Get, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/auth/auth.decorators.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import type { Env } from "../../config/env.schema.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { buildFacebookFeed } from "./facebook-feed.js";

/** GET /feeds/facebook.xml — catalog for Facebook/Instagram Shops (PRD §10). */
@Public()
@Controller("feeds")
export class FeedsController {
  private readonly siteUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly settings: SettingsService,
    config: ConfigService<Env, true>,
  ) {
    this.siteUrl = config.get("SITE_URL", { infer: true });
  }

  @Get("facebook.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  // Facebook fetches it a few times a day; let caches keep it for an hour.
  @Header("Cache-Control", "public, max-age=3600")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async facebook(): Promise<string> {
    const [store, rows] = await Promise.all([
      this.settings.store(),
      this.prisma.product.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        take: 2000,
        select: {
          slug: true,
          name: true,
          shortDesc: true,
          description: true,
          basePrice: true,
          salePrice: true,
          saleStart: true,
          saleEnd: true,
          category: { select: { name: true } },
          images: {
            select: { colorId: true, media: true },
            orderBy: { sortOrder: "asc" },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              stock: true,
              priceOverride: true,
              colorId: true,
              size: { select: { name: true } },
              color: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    const largest = (m: Parameters<MediaService["toDto"]>[0]) => {
      const dto = this.media.toDto(m);
      return dto.renditions.at(-1)?.url ?? dto.url;
    };
    return buildFacebookFeed(
      rows.map((p) => ({
        slug: p.slug,
        name: p.name,
        shortDesc: p.shortDesc,
        description: p.description,
        category: p.category.name,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        saleStart: p.saleStart,
        saleEnd: p.saleEnd,
        images: p.images.map((i) => ({
          url: largest(i.media),
          colorId: i.colorId,
        })),
        variants: p.variants.map((v) => ({
          id: v.id,
          stock: v.stock,
          priceOverride: v.priceOverride,
          colorId: v.colorId,
          sizeName: v.size.name,
          colorName: v.color.name,
        })),
      })),
      { url: this.siteUrl, name: store.name },
    );
  }
}
