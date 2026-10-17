import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  catalogListQuerySchema,
  categoryInputSchema,
  categoryUpdateSchema,
} from "@aaarchive/shared/catalog";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import { uniqueSlug } from "../../common/slug/unique-slug.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import {
  type AdminCategory,
  categoryInclude,
  toAdminCategory,
} from "./categories.mapper.js";

type ListQuery = z.output<typeof catalogListQuerySchema>;
type CreateInput = z.output<typeof categoryInputSchema>;
type UpdateInput = z.output<typeof categoryUpdateSchema>;

/** Categories (PRD §6.3): the main product types — Hoodies, Panjabi… */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list({ q, page, limit }: ListQuery) {
    const where = q
      ? { name: { contains: q, mode: "insensitive" as const } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: categoryInclude,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);
    return {
      data: rows.map((r) => toAdminCategory(r, this.media)),
      meta: { page, limit, total },
    };
  }

  async get(id: string): Promise<AdminCategory> {
    const row = await this.prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
    if (!row) throw notFound();
    return toAdminCategory(row, this.media);
  }

  async create(input: CreateInput): Promise<AdminCategory> {
    if (input.image) await this.media.assertExists(input.image.mediaId);
    const slug =
      input.slug ?? (await uniqueSlug(input.name, this.slugTaken, "category"));
    if (input.slug && (await this.slugTaken(input.slug))) throw slugTaken();

    const row = await this.prisma.category
      .create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          imageId: input.image?.mediaId ?? null,
          imageAlt: input.image?.alt ?? null,
          sortOrder: input.sortOrder,
          showOnHome: input.showOnHome,
        },
        include: categoryInclude,
      })
      .catch(rethrowSlugTaken);
    void this.revalidation.revalidate(tagsFor(row.slug));
    return toAdminCategory(row, this.media);
  }

  async update(id: string, input: UpdateInput): Promise<AdminCategory> {
    const current = await this.prisma.category.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!current) throw notFound();
    if (input.image) await this.media.assertExists(input.image.mediaId);
    if (
      input.slug &&
      input.slug !== current.slug &&
      (await this.slugTaken(input.slug))
    ) {
      throw slugTaken();
    }

    const row = await this.prisma.category
      .update({
        where: { id },
        data: {
          name: input.name,
          // The slug only changes when sent: renaming keeps URLs stable.
          slug: input.slug,
          description: input.description,
          ...(input.image !== undefined && {
            imageId: input.image?.mediaId ?? null,
            imageAlt: input.image?.alt ?? null,
          }),
          sortOrder: input.sortOrder,
          showOnHome: input.showOnHome,
        },
        include: categoryInclude,
      })
      .catch(rethrowSlugTaken);
    void this.revalidation.revalidate([
      ...tagsFor(row.slug),
      cacheTags.category(current.slug),
    ]);
    return toAdminCategory(row, this.media);
  }

  /** A category with products cannot be deleted: move them first. */
  async remove(id: string): Promise<void> {
    const row = await this.prisma.category.findUnique({
      where: { id },
      select: { slug: true, _count: { select: { products: true } } },
    });
    if (!row) throw notFound();
    if (row._count.products > 0) {
      throw new ConflictException({
        message: "Move this category's products to another category first",
        code: "CATEGORY_IN_USE",
      });
    }
    await this.prisma.category.delete({ where: { id } });
    void this.revalidation.revalidate(tagsFor(row.slug));
  }

  private readonly slugTaken = async (slug: string): Promise<boolean> =>
    (await this.prisma.category.count({ where: { slug } })) > 0;
}

/** Category name/photo shows on home, listings and product breadcrumbs. */
function tagsFor(slug: string): string[] {
  return [
    cacheTags.categories,
    cacheTags.category(slug),
    cacheTags.home,
    cacheTags.products,
  ];
}

function notFound() {
  return new NotFoundException({
    message: "Category not found",
    code: "NOT_FOUND",
  });
}

function slugTaken() {
  return new ConflictException({
    message: "Another category already uses this URL",
    code: "SLUG_TAKEN",
  });
}

function rethrowSlugTaken(error: unknown): never {
  if (isUniqueViolation(error)) throw slugTaken();
  throw error;
}
