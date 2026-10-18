import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  catalogListQuerySchema,
  sizeInputSchema,
  sizeUpdateSchema,
} from "@aaarchive/shared/catalog";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import {
  isNotFound,
  isUniqueViolation,
} from "../../common/prisma/prisma-errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";

type ListQuery = z.output<typeof catalogListQuerySchema>;
type CreateInput = z.output<typeof sizeInputSchema>;
type UpdateInput = z.output<typeof sizeUpdateSchema>;

export type AdminSize = {
  id: string;
  name: string;
  sortOrder: number;
  variantCount: number;
};

const include = { _count: { select: { variants: true } } } as const;

function toAdminSize(row: {
  id: string;
  name: string;
  sortOrder: number;
  _count: { variants: number };
}): AdminSize {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    variantCount: row._count.variants,
  };
}

/** Sizes offered when generating variants (PRD §6.2, §6.7). */
@Injectable()
export class SizesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list({ q, page, limit }: ListQuery) {
    const where = q
      ? { name: { contains: q, mode: "insensitive" as const } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.size.findMany({
        where,
        include,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.size.count({ where }),
    ]);
    return { data: rows.map(toAdminSize), meta: { page, limit, total } };
  }

  async create(input: CreateInput): Promise<AdminSize> {
    const row = await this.prisma.size
      .create({ data: input, include })
      .catch(rethrow);
    return toAdminSize(row);
  }

  async update(id: string, input: UpdateInput): Promise<AdminSize> {
    const row = await this.prisma.size
      .update({ where: { id }, data: input, include })
      .catch(rethrow);
    // Size names and order show on every product page using them.
    if (row._count.variants > 0) {
      void this.revalidation.revalidate([cacheTags.products]);
    }
    return toAdminSize(row);
  }

  /** A size used by any variant cannot be deleted (old orders keep a snapshot). */
  async remove(id: string): Promise<void> {
    const used = await this.prisma.variant.count({ where: { sizeId: id } });
    if (used > 0) {
      throw new ConflictException({
        message: "Products still use this size",
        code: "SIZE_IN_USE",
      });
    }
    await this.prisma.size.delete({ where: { id } }).catch(rethrow);
  }
}

function rethrow(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException({
      message: "A size with this name already exists",
      code: "NAME_TAKEN",
    });
  }
  if (isNotFound(error)) {
    throw new NotFoundException({
      message: "Size not found",
      code: "NOT_FOUND",
    });
  }
  throw error;
}
