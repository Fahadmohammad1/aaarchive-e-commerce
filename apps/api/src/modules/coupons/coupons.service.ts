import type { couponApplySchema } from "@aaarchive/shared/checkout";
import {
  type CouponError,
  type CouponLine,
  couponDiscount,
  type couponExportQuerySchema,
  type couponInputSchema,
  couponIssues,
  type couponListQuerySchema,
  type couponUpdateSchema,
} from "@aaarchive/shared/coupon";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { z } from "zod";
import {
  isNotFound,
  isUniqueViolation,
} from "../../common/prisma/prisma-errors.js";
import type { Coupon, Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PricingService, subtotalOf } from "../cart/pricing.service.js";

type ListQuery = z.output<typeof couponListQuerySchema>;
type ExportQuery = z.output<typeof couponExportQuerySchema>;
type CreateInput = z.output<typeof couponInputSchema>;
type UpdateInput = z.output<typeof couponUpdateSchema>;

export type AdminCoupon = {
  id: string;
  code: string;
  type: Coupon["type"];
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perPhoneLimit: number | null;
  scope: Coupon["scope"];
  scopeIds: string[];
  isActive: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
};

export function toAdminCoupon(row: Coupon): AdminCoupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    minOrder: row.minOrder,
    maxDiscount: row.maxDiscount,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    usageLimit: row.usageLimit,
    perPhoneLimit: row.perPhoneLimit,
    scope: row.scope,
    scopeIds: row.scopeIds,
    isActive: row.isActive,
    usedCount: row.usedCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const COUPON_MESSAGES: Record<CouponError, string> = {
  COUPON_INVALID: "This coupon code is not valid",
  COUPON_EXPIRED: "This coupon has expired",
  COUPON_NOT_STARTED: "This coupon is not active yet",
  COUPON_MIN_ORDER: "Your order is below this coupon's minimum",
  COUPON_NOT_APPLICABLE: "This coupon does not apply to these items",
  COUPON_LIMIT_REACHED: "This coupon has reached its usage limit",
};

export function couponError(code: CouponError, coupon?: { minOrder: number }) {
  return new UnprocessableEntityException({
    message: COUPON_MESSAGES[code],
    code,
    // The minimum is public information, shown so the customer can add more.
    ...(code === "COUPON_MIN_ORDER" && coupon
      ? { details: { minOrder: coupon.minOrder } }
      : {}),
  });
}

/** Coupons (PRD §5.7, §6.6). */
@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * The discount `code` gives on these lines, or a 422 with the reason.
   * Orders call it again inside checkout; the usage count is then claimed
   * atomically (OrdersService).
   */
  async evaluate(
    code: string,
    lines: readonly CouponLine[],
    phone: string | null,
    now: Date = new Date(),
  ): Promise<{ coupon: Coupon; discount: number }> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw couponError("COUPON_INVALID");
    const phoneUses =
      phone && coupon.perPhoneLimit != null
        ? await this.prisma.order.count({
            where: { couponCode: code, phone, status: { not: "CANCELLED" } },
          })
        : null;
    const result = couponDiscount(coupon, [...lines], phoneUses, now);
    if (!result.ok) throw couponError(result.code, coupon);
    return { coupon, discount: result.discount };
  }

  /** POST /coupons/apply: priced from the database, like the order will be. */
  async apply(input: z.output<typeof couponApplySchema>) {
    const { lines } = await this.pricing.price(input.items);
    const { coupon, discount } = await this.evaluate(
      input.code,
      lines,
      input.phone ?? null,
    );
    return {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      subtotal: subtotalOf(lines),
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  private where({ q, status }: Pick<ListQuery, "q" | "status">) {
    const where: Prisma.CouponWhereInput = {};
    if (q) where.code = { contains: q.toUpperCase() };
    if (status) where.isActive = status === "active";
    return where;
  }

  async list(query: ListQuery) {
    const where = this.where(query);
    const [rows, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return {
      data: rows.map(toAdminCoupon),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async get(id: string): Promise<AdminCoupon> {
    const row = await this.prisma.coupon.findUnique({ where: { id } });
    if (!row) throw notFound();
    return toAdminCoupon(row);
  }

  async create(input: CreateInput): Promise<AdminCoupon> {
    const row = await this.prisma.coupon
      .create({ data: dataOf(input) })
      .catch(rethrow);
    return toAdminCoupon(row);
  }

  async update(id: string, input: UpdateInput): Promise<AdminCoupon> {
    const current = await this.prisma.coupon.findUnique({ where: { id } });
    if (!current) throw notFound();
    // The cross-field rules hold for the record as it will be saved.
    const merged = { ...toAdminCoupon(current), ...input };
    const [issue] = couponIssues(merged);
    if (issue) {
      throw new BadRequestException({
        message: "Invalid coupon",
        code: "VALIDATION_ERROR",
        details: { fieldErrors: { [issue.path]: [issue.message] } },
      });
    }
    const row = await this.prisma.coupon
      .update({ where: { id }, data: dataOf(input) })
      .catch(rethrow);
    return toAdminCoupon(row);
  }

  /** A coupon that was used stays for the record: switch it off instead. */
  async remove(id: string): Promise<void> {
    const row = await this.prisma.coupon.findUnique({ where: { id } });
    if (!row) throw notFound();
    if (row.usedCount > 0) {
      throw new ConflictException({
        message: "This coupon has been used; switch it off instead",
        code: "COUPON_IN_USE",
      });
    }
    await this.prisma.coupon.delete({ where: { id } }).catch(rethrow);
  }

  async *exportRows(query: ExportQuery): AsyncGenerator<Coupon> {
    const where = this.where(query);
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.coupon.findMany({
        where,
        orderBy: { id: "asc" },
        take: 500,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      yield* batch;
      if (batch.length < 500) return;
      cursor = batch[batch.length - 1].id;
    }
  }

  countForExport(query: ExportQuery) {
    return this.prisma.coupon.count({ where: this.where(query) });
  }
}

/** ISO strings → Dates; fields left out of a PATCH stay out. */
function dataOf<T extends UpdateInput>(input: T) {
  const { startsAt, endsAt, ...rest } = input;
  return {
    ...rest,
    ...(startsAt !== undefined
      ? { startsAt: startsAt ? new Date(startsAt) : null }
      : {}),
    ...(endsAt !== undefined
      ? { endsAt: endsAt ? new Date(endsAt) : null }
      : {}),
  };
}

function notFound() {
  return new NotFoundException({
    message: "Coupon not found",
    code: "NOT_FOUND",
  });
}

function rethrow(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException({
      message: "A coupon with this code already exists",
      code: "CODE_TAKEN",
    });
  }
  if (isNotFound(error)) throw notFound();
  throw error;
}
