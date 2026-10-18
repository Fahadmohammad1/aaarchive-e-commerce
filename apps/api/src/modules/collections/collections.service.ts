import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  catalogListQuerySchema,
  collectionInputSchema,
  collectionUpdateSchema,
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
  type AdminCollection,
  collectionInclude,
  toAdminCollection,
} from "./collections.mapper.js";

type ListQuery = z.output<typeof catalogListQuerySchema>;
type CreateInput = z.output<typeof collectionInputSchema>;
type UpdateInput = z.output<typeof collectionUpdateSchema>;

/** Collections (PRD §6.3): campaigns and groups — Eid, Winter Drop… */
@Injectable()
export class CollectionsService {
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
      this.prisma.collection.findMany({
        where,
        include: collectionInclude,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.collection.count({ where }),
    ]);
    return {
      data: rows.map((r) => toAdminCollection(r, this.media)),
      meta: { page, limit, total },
    };
  }

  async get(id: string): Promise<AdminCollection> {
    const row = await this.prisma.collection.findUnique({
      where: { id },
      include: collectionInclude,
    });
    if (!row) throw notFound();
    return toAdminCollection(row, this.media);
  }

  async create(input: CreateInput): Promise<AdminCollection> {
    if (input.image) await this.media.assertExists(input.image.mediaId);
    const slug =
      input.slug ??
      (await uniqueSlug(input.name, this.slugTaken, "collection"));
    if (input.slug && (await this.slugTaken(input.slug))) throw slugTaken();

    const row = await this.prisma.collection
      .create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          imageId: input.image?.mediaId ?? null,
          imageAlt: input.image?.alt ?? null,
          sortOrder: input.sortOrder,
          showOnHome: input.showOnHome,
          isActive: input.isActive,
        },
        include: collectionInclude,
      })
      .catch(rethrowSlugTaken);
    void this.revalidation.revalidate(tagsFor(row.slug));
    return toAdminCollection(row, this.media);
  }

  async update(id: string, input: UpdateInput): Promise<AdminCollection> {
    const current = await this.prisma.collection.findUnique({
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

    const row = await this.prisma.collection
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
          isActive: input.isActive,
        },
        include: collectionInclude,
      })
      .catch(rethrowSlugTaken);
    void this.revalidation.revalidate([
      ...tagsFor(row.slug),
      cacheTags.collection(current.slug),
    ]);
    return toAdminCollection(row, this.media);
  }

  /** Deleting a collection only unlinks its products; they stay for sale. */
  async remove(id: string): Promise<void> {
    const row = await this.prisma.collection.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!row) throw notFound();
    await this.prisma.collection.delete({ where: { id } });
    void this.revalidation.revalidate(tagsFor(row.slug));
  }

  private readonly slugTaken = async (slug: string): Promise<boolean> =>
    (await this.prisma.collection.count({ where: { slug } })) > 0;
}

/** Collection name/photo shows on home, listings and product pages. */
function tagsFor(slug: string): string[] {
  return [
    cacheTags.collections,
    cacheTags.collection(slug),
    cacheTags.home,
    cacheTags.products,
  ];
}

function notFound() {
  return new NotFoundException({
    message: "Collection not found",
    code: "NOT_FOUND",
  });
}

function slugTaken() {
  return new ConflictException({
    message: "Another collection already uses this URL",
    code: "SLUG_TAKEN",
  });
}

function rethrowSlugTaken(error: unknown): never {
  if (isUniqueViolation(error)) throw slugTaken();
  throw error;
}
