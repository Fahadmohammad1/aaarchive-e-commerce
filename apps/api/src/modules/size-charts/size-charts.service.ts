import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  catalogListQuerySchema,
  SizeChartValues,
} from "@aaarchive/shared/catalog";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import { isNotFound } from "../../common/prisma/prisma-errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import {
  type AdminSizeChart,
  sizeChartInclude as include,
  toAdminSizeChart,
} from "./size-charts.mapper.js";

type ListQuery = z.output<typeof catalogListQuerySchema>;

/** Size chart templates products choose from (PRD §5.5, §6.2, §6.8). */
@Injectable()
export class SizeChartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list({ q, page, limit }: ListQuery) {
    const where = q
      ? { name: { contains: q, mode: "insensitive" as const } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.sizeChart.findMany({
        where,
        include,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sizeChart.count({ where }),
    ]);
    return { data: rows.map(toAdminSizeChart), meta: { page, limit, total } };
  }

  async get(id: string): Promise<AdminSizeChart> {
    const row = await this.prisma.sizeChart.findUnique({
      where: { id },
      include,
    });
    if (!row) throw notFound();
    return toAdminSizeChart(row);
  }

  async create(input: SizeChartValues): Promise<AdminSizeChart> {
    await this.assertNameFree(input.name);
    const row = await this.prisma.sizeChart.create({ data: input, include });
    return toAdminSizeChart(row);
  }

  async update(id: string, input: SizeChartValues): Promise<AdminSizeChart> {
    await this.assertNameFree(input.name, id);
    const row = await this.prisma.sizeChart
      .update({ where: { id }, data: input, include })
      .catch(rethrow);
    // The chart shows in the size-chart modal of every product using it.
    if (row._count.products > 0) {
      void this.revalidation.revalidate([cacheTags.products]);
    }
    return toAdminSizeChart(row);
  }

  /** Refused while products use it, so no product silently loses its chart. */
  async remove(id: string): Promise<void> {
    const used = await this.prisma.product.count({
      where: { sizeChartId: id },
    });
    if (used > 0) {
      throw new ConflictException({
        message: "Products still use this size chart",
        code: "SIZE_CHART_IN_USE",
      });
    }
    await this.prisma.sizeChart.delete({ where: { id } }).catch(rethrow);
  }

  /** Names pick a chart in the product editor, so two charts never share one. */
  private async assertNameFree(name: string, exceptId?: string) {
    const clash = await this.prisma.sizeChart.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException({
        message: "A size chart with this name already exists",
        code: "NAME_TAKEN",
      });
    }
  }
}

function notFound() {
  return new NotFoundException({
    message: "Size chart not found",
    code: "NOT_FOUND",
  });
}

function rethrow(error: unknown): never {
  if (isNotFound(error)) throw notFound();
  throw error;
}
