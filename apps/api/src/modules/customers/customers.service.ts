import { successRate } from "@aaarchive/shared/customer";
import { normalizeBdPhone } from "@aaarchive/shared/phone";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestUser } from "../../common/auth/request-user.js";
import {
  isNotFound,
  isUniqueViolation,
} from "../../common/prisma/prisma-errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  adminOrderListSelect,
  toAdminOrderListItem,
} from "../orders/admin-orders.mapper.js";
import {
  type CustomerFilters,
  type CustomerRow,
  customerCountSql,
  customersSql,
} from "./customers.query.js";

export function toCustomer(row: CustomerRow) {
  return {
    phone: row.phone,
    name: row.name,
    email: row.email,
    orders: row.orders,
    delivered: row.delivered,
    cancelledOrReturned: row.failed,
    successRate: successRate(row.delivered, row.failed),
    totalSpent: row.spent,
    firstOrderAt: row.firstOrderAt.toISOString(),
    lastOrderAt: row.lastOrderAt.toISOString(),
    blocked: row.blocked,
  };
}

/** Customers by phone and the COD blocklist (PRD §6.5). OWNER and STAFF. */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CustomerFilters & { page: number; limit: number }) {
    const [rows, [count]] = await Promise.all([
      this.prisma.$queryRaw<CustomerRow[]>(
        customersSql(query, {
          limit: query.limit,
          offset: (query.page - 1) * query.limit,
        }),
      ),
      this.prisma.$queryRaw<{ n: number }[]>(customerCountSql(query)),
    ]);
    return {
      data: rows.map(toCustomer),
      meta: { page: query.page, limit: query.limit, total: count?.n ?? 0 },
    };
  }

  async get(rawPhone: string) {
    const phone = normalizeBdPhone(rawPhone);
    if (!phone) throw notFound();
    const summary = (
      await this.prisma.$queryRaw<CustomerRow[]>(customersSql({ q: phone }))
    ).find((row) => row.phone === phone);
    const blocked = await this.prisma.blockedPhone.findUnique({
      where: { phone },
      select: {
        reason: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    });
    if (!summary && !blocked) throw notFound();
    const orders = await this.prisma.order.findMany({
      where: { phone },
      select: adminOrderListSelect,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      phone,
      customer: summary ? toCustomer(summary) : null,
      block: blocked
        ? {
            reason: blocked.reason,
            at: blocked.createdAt.toISOString(),
            by: blocked.createdBy?.name ?? null,
          }
        : null,
      orders: orders.map(toAdminOrderListItem),
    };
  }

  // ── Blocklist: blocked phones cannot order COD (PRD §5.8) ────────────────

  async listBlocked(q: string | undefined, page: number, limit: number) {
    const digits = q ? (normalizeBdPhone(q) ?? q.replace(/\D/g, "")) : "";
    const where = digits ? { phone: { contains: digits } } : {};
    const [rows, total] = await Promise.all([
      this.prisma.blockedPhone.findMany({
        where,
        select: {
          id: true,
          phone: true,
          reason: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blockedPhone.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        phone: r.phone,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        createdBy: r.createdBy?.name ?? null,
      })),
      meta: { page, limit, total },
    };
  }

  async block(phone: string, reason: string, user: RequestUser) {
    try {
      const row = await this.prisma.blockedPhone.create({
        data: { phone, reason, createdById: user.id },
      });
      return {
        id: row.id,
        phone: row.phone,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
        createdBy: user.name,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: "This number is already blocked",
          code: "PHONE_ALREADY_BLOCKED",
        });
      }
      throw error;
    }
  }

  async unblock(id: string): Promise<void> {
    await this.prisma.blockedPhone.delete({ where: { id } }).catch((error) => {
      if (isNotFound(error)) throw notFound();
      throw error;
    });
  }
}

function notFound() {
  return new NotFoundException({
    message: "Customer not found",
    code: "NOT_FOUND",
  });
}
