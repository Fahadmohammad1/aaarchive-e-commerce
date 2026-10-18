import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/auth.decorators.js";
import {
  type StoreGroup,
  storeGroupSelect,
  toStoreGroup,
} from "../../common/catalog/store-groups.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";

/** GET /collections: visible collections only (hidden ones 404 on the store). */
@Public()
@Controller("collections")
export class CollectionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  @Get()
  async list(): Promise<StoreGroup[]> {
    const rows = await this.prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        ...storeGroupSelect,
        _count: {
          select: {
            products: { where: { product: { status: "PUBLISHED" } } },
          },
        },
      },
    });
    return rows.map((r) => toStoreGroup(r, r._count.products, this.media));
  }
}
