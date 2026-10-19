import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * Everything the sitemap lists (PRD §9.2): published products, categories,
 * visible collections and content pages, with last-modified dates. Public
 * data only.
 */
@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async entries() {
    const [products, categories, collections, pages] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
      this.prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.collection.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.page.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    const iso = (rows: Array<{ slug: string; updatedAt: Date }>) =>
      rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
    return {
      products: iso(products),
      categories: iso(categories),
      collections: iso(collections),
      pages: iso(pages),
    };
  }
}
