import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  catalogListQuerySchema,
  colorInputSchema,
  colorUpdateSchema,
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
type CreateInput = z.output<typeof colorInputSchema>;
type UpdateInput = z.output<typeof colorUpdateSchema>;

export type AdminColor = {
  id: string;
  name: string;
  hex: string;
  sortOrder: number;
  variantCount: number;
};

const include = { _count: { select: { variants: true } } } as const;

function toAdminColor(row: {
  id: string;
  name: string;
  hex: string;
  sortOrder: number;
  _count: { variants: number };
}): AdminColor {
  return {
    id: row.id,
    name: row.name,
    hex: row.hex,
    sortOrder: row.sortOrder,
    variantCount: row._count.variants,
  };
}

/** Colors offered when generating variants (PRD §6.2, §6.7). */
@Injectable()
export class ColorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list({ q, page, limit }: ListQuery) {
    const where = q
      ? { name: { contains: q, mode: "insensitive" as const } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.color.findMany({
        where,
        include,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.color.count({ where }),
    ]);
    return { data: rows.map(toAdminColor), meta: { page, limit, total } };
  }

  async create(input: CreateInput): Promise<AdminColor> {
    const row = await this.prisma.color
      .create({ data: input, include })
      .catch(rethrow);
    return toAdminColor(row);
  }

  async update(id: string, input: UpdateInput): Promise<AdminColor> {
    const row = await this.prisma.color
      .update({ where: { id }, data: input, include })
      .catch(rethrow);
    // Colour names and swatches show on every product page using them.
    if (row._count.variants > 0) {
      void this.revalidation.revalidate([cacheTags.products]);
    }
    return toAdminColor(row);
  }

  /** A colour used by any variant cannot be deleted (old orders keep a snapshot). */
  async remove(id: string): Promise<void> {
    const used = await this.prisma.variant.count({ where: { colorId: id } });
    if (used > 0) {
      throw new ConflictException({
        message: "Products still use this colour",
        code: "COLOR_IN_USE",
      });
    }
    await this.prisma.color.delete({ where: { id } }).catch(rethrow);
  }
}

function rethrow(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException({
      message: "A colour with this name already exists",
      code: "NAME_TAKEN",
    });
  }
  if (isNotFound(error)) {
    throw new NotFoundException({
      message: "Colour not found",
      code: "NOT_FOUND",
    });
  }
  throw error;
}
