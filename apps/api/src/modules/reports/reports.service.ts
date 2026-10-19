import { ORDER_STATUSES, type OrderStatus } from "@aaarchive/shared/order";
import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";

const DHAKA_OFFSET_MS = 6 * 3_600_000;

/** Start of today and of this month in Asia/Dhaka (UTC+6, no DST). */
export function dhakaPeriodStarts(now: Date = new Date()) {
  const local = new Date(now.getTime() + DHAKA_OFFSET_MS);
  const day = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const month = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  return {
    today: new Date(day - DHAKA_OFFSET_MS),
    month: new Date(month - DHAKA_OFFSET_MS),
  };
}

type PeriodRow = { orders: number; revenue: number; pending: number };

/**
 * Dashboard numbers (PRD §6.1). Revenue counts only orders that are
 * Delivered or Paid (and not cancelled/returned); orders still open are
 * reported separately as pending. Periods are by order date, Dhaka time.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async summary(now: Date = new Date()) {
    const { today, month } = dhakaPeriodStarts(now);
    const { lowStockThreshold } = await this.settings.stock();
    const [todayRow, monthRow, byStatus, awaiting, lowStock, bestSellers] =
      await Promise.all([
        this.period(today),
        this.period(month),
        this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.payment.count({ where: { status: "PENDING" } }),
        this.prisma.$queryRaw<
          Array<{
            variantId: string;
            productId: string;
            productName: string;
            sku: string;
            sizeName: string;
            colorName: string;
            stock: number;
          }>
        >(Prisma.sql`
          select v.id as "variantId", p.id as "productId", p.name as "productName",
                 v.sku, s.name as "sizeName", c.name as "colorName", v.stock
            from "Variant" v
            join "Product" p on p.id = v."productId"
            join "Size" s on s.id = v."sizeId"
            join "Color" c on c.id = v."colorId"
           where v."isActive" and p.status <> 'ARCHIVED'
             and v.stock <= coalesce(p."lowStockThreshold", ${lowStockThreshold})
           order by v.stock asc, p.name, v.sku
           limit 10`),
        this.prisma.$queryRaw<
          Array<{
            productId: string | null;
            productName: string;
            quantity: number;
            revenue: number;
          }>
        >(Prisma.sql`
          select p.id as "productId",
                 coalesce(p.name, min(oi."productName")) as "productName",
                 sum(oi.quantity)::int as quantity,
                 sum(oi."lineTotal")::int as revenue
            from "OrderItem" oi
            join "Order" o on o.id = oi."orderId"
            left join "Variant" v on v.id = oi."variantId"
            left join "Product" p on p.id = v."productId"
           where o."createdAt" >= ${month}
             and o.status not in ('CANCELLED', 'RETURNED')
           group by p.id, coalesce(p.name, oi."productName")
           order by quantity desc, revenue desc
           limit 5`),
      ]);
    const counts = Object.fromEntries(
      byStatus.map((r) => [r.status, r._count._all]),
    ) as Partial<Record<OrderStatus, number>>;
    return {
      today: todayRow,
      month: monthRow,
      byStatus: ORDER_STATUSES.map((status) => ({
        status,
        count: counts[status] ?? 0,
      })),
      paymentsAwaiting: awaiting,
      lowStockThreshold,
      lowStock,
      bestSellers,
      generatedAt: now.toISOString(),
    };
  }

  private async period(since: Date): Promise<PeriodRow> {
    const [row] = await this.prisma.$queryRaw<PeriodRow[]>(Prisma.sql`
      select count(*)::int as orders,
             coalesce(sum(total) filter (
               where status not in ('CANCELLED', 'RETURNED')
                 and (status = 'DELIVERED' or "paymentStatus" = 'PAID')), 0)::int as revenue,
             coalesce(sum(total) filter (
               where status not in ('CANCELLED', 'RETURNED', 'DELIVERED')
                 and "paymentStatus" <> 'PAID'), 0)::int as pending
        from "Order"
       where "createdAt" >= ${since}`);
    return row ?? { orders: 0, revenue: 0, pending: 0 };
  }
}
