import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/auth.decorators.js";
import {
  type StoreGroup,
  storeGroupSelect,
  toStoreGroup,
} from "../../common/catalog/store-groups.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";

/** GET /categories: every category in display order (PRD §5.2 H2, §5.3). */
@Public()
@Controller("categories")
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  @Get()
  async list(): Promise<StoreGroup[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        ...storeGroupSelect,
        _count: {
          select: { products: { where: { status: "PUBLISHED" } } },
        },
      },
    });
    return rows.map((r) => toStoreGroup(r, r._count.products, this.media));
  }
}
