import { dhakaRange, ORDER_STATUSES } from "@aaarchive/shared/order";
import {
  resolveSalesRange,
  type SalesReportQuery,
} from "@aaarchive/shared/report";
import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

// Same money rules as the dashboard home (PRD §6.1): an order counts as a sale
// unless it was cancelled or returned; revenue is only Delivered or Paid.
const VALID = Prisma.sql`o.status not in ('CANCELLED', 'RETURNED')`;
const REALISED = Prisma.sql`(${VALID} and (o.status = 'DELIVERED' or o."paymentStatus" = 'PAID'))`;
const OPEN_UNPAID = Prisma.sql`(o.status not in ('CANCELLED', 'RETURNED', 'DELIVERED') and o."paymentStatus" <> 'PAID')`;
/** Order date as a Dhaka calendar day ("createdAt" is stored in UTC). */
const DHAKA_DAY = Prisma.sql`to_char(o."createdAt" + interval '6 hours', 'YYYY-MM-DD')`;

export type SalesTotals = {
  /** Every order placed, whatever happened to it. */
  orders: number;
  /** Orders not cancelled or returned. */
  validOrders: number;
  /** Order value (totals incl. delivery) of valid orders. */
  grossSales: number;
  /** Delivered or Paid. */
  revenue: number;
  /** Open and unpaid. */
  pending: number;
  discount: number;
  deliveryCharges: number;
  unitsSold: number;
  delivered: number;
  cancelled: number;
  returned: number;
};

export type DailySales = {
  date: string;
  orders: number;
  grossSales: number;
  revenue: number;
};

const EMPTY_TOTALS: SalesTotals = {
  orders: 0,
  validOrders: 0,
  grossSales: 0,
  revenue: 0,
  pending: 0,
  discount: 0,
  deliveryCharges: 0,
  unitsSold: 0,
  delivered: 0,
  cancelled: 0,
  returned: 0,
};

/** One entry per day of the range, zeros where nothing was ordered. */
export function fillDays(days: string[], rows: DailySales[]): DailySales[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return days.map(
    (date) =>
      byDate.get(date) ?? { date, orders: 0, grossSales: 0, revenue: 0 },
  );
}

/**
 * Sales analytics for a Dhaka date range, Owner only (PRD §3: Staff handle
 * orders, not business numbers). Everything is computed from orders by
 * order date; nothing here exposes stock.
 */
@Injectable()
export class SalesReportService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(query: SalesReportQuery, now: Date = new Date()) {
    const range = resolveSalesRange(query, now);
    const { gte, lt } = dhakaRange(range.from, range.to) as {
      gte: Date;
      lt: Date;
    };
    const previous = dhakaRange(range.previousFrom, range.previousTo) as {
      gte: Date;
      lt: Date;
    };
    const inRange = Prisma.sql`o."createdAt" >= ${gte} and o."createdAt" < ${lt}`;

    const [
      totals,
      previousTotals,
      daily,
      byStatus,
      byPaymentMethod,
      byZone,
      topProducts,
      byCategory,
      bySize,
      byColor,
      coupons,
      customers,
    ] = await Promise.all([
      this.totals(gte, lt),
      this.totals(previous.gte, previous.lt),
      this.prisma.$queryRaw<DailySales[]>(Prisma.sql`
        select ${DHAKA_DAY} as date,
               count(*)::int as orders,
               coalesce(sum(o.total) filter (where ${VALID}), 0)::int as "grossSales",
               coalesce(sum(o.total) filter (where ${REALISED}), 0)::int as revenue
          from "Order" o
         where ${inRange}
         group by 1`),
      this.prisma.$queryRaw<
        Array<{ status: string; orders: number; value: number }>
      >(Prisma.sql`
        select o.status::text as status, count(*)::int as orders,
               coalesce(sum(o.total), 0)::int as value
          from "Order" o
         where ${inRange}
         group by o.status`),
      this.prisma.$queryRaw<
        Array<{ method: string; orders: number; value: number }>
      >(Prisma.sql`
        select o."paymentMethod"::text as method, count(*)::int as orders,
               coalesce(sum(o.total), 0)::int as value
          from "Order" o
         where ${inRange} and ${VALID}
         group by o."paymentMethod"
         order by value desc`),
      this.prisma.$queryRaw<
        Array<{ zoneId: string; name: string; orders: number; value: number }>
      >(Prisma.sql`
        select z.id as "zoneId", z.name, count(*)::int as orders,
               coalesce(sum(o.total), 0)::int as value
          from "Order" o
          join "DeliveryZone" z on z.id = o."zoneId"
         where ${inRange} and ${VALID}
         group by z.id, z.name
         order by orders desc, value desc`),
      // Deleted variants keep their order lines (variantId set null), so the
      // product falls back to the name snapshot on the line.
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
         where ${inRange} and ${VALID}
         group by p.id, coalesce(p.name, oi."productName")
         order by revenue desc, quantity desc
         limit 10`),
      this.prisma.$queryRaw<
        Array<{
          categoryId: string | null;
          name: string | null;
          quantity: number;
          revenue: number;
        }>
      >(Prisma.sql`
        select c.id as "categoryId", c.name,
               sum(oi.quantity)::int as quantity,
               sum(oi."lineTotal")::int as revenue
          from "OrderItem" oi
          join "Order" o on o.id = oi."orderId"
          left join "Variant" v on v.id = oi."variantId"
          left join "Product" p on p.id = v."productId"
          left join "Category" c on c.id = p."categoryId"
         where ${inRange} and ${VALID}
         group by c.id, c.name
         order by revenue desc`),
      this.prisma.$queryRaw<Array<{ name: string; quantity: number }>>(
        Prisma.sql`
        select oi."sizeName" as name, sum(oi.quantity)::int as quantity
          from "OrderItem" oi
          join "Order" o on o.id = oi."orderId"
         where ${inRange} and ${VALID}
         group by oi."sizeName"
         order by quantity desc
         limit 12`,
      ),
      this.prisma.$queryRaw<Array<{ name: string; quantity: number }>>(
        Prisma.sql`
        select oi."colorName" as name, sum(oi.quantity)::int as quantity
          from "OrderItem" oi
          join "Order" o on o.id = oi."orderId"
         where ${inRange} and ${VALID}
         group by oi."colorName"
         order by quantity desc
         limit 12`,
      ),
      this.prisma.$queryRaw<
        Array<{ code: string; orders: number; discount: number }>
      >(Prisma.sql`
        select o."couponCode" as code, count(*)::int as orders,
               coalesce(sum(o.discount), 0)::int as discount
          from "Order" o
         where ${inRange} and ${VALID} and o."couponCode" is not null
         group by o."couponCode"
         order by orders desc, discount desc
         limit 10`),
      // A customer is a phone number (PRD §6.5). New = their first order
      // ever falls inside the range.
      this.prisma.$queryRaw<Array<{ total: number; new: number }>>(Prisma.sql`
        with buyers as (
          select distinct o.phone from "Order" o where ${inRange}
        )
        select count(*)::int as total,
               count(*) filter (where f.first >= ${gte})::int as new
          from buyers b
          cross join lateral (
            select min(x."createdAt") as first from "Order" x where x.phone = b.phone
          ) f`),
    ]);

    const statusRows = new Map(byStatus.map((r) => [r.status, r]));
    const customerRow = customers[0] ?? { total: 0, new: 0 };
    return {
      range,
      totals,
      previous: previousTotals,
      daily: fillDays(range.days, daily),
      byStatus: ORDER_STATUSES.map((status) => ({
        status,
        orders: statusRows.get(status)?.orders ?? 0,
        value: statusRows.get(status)?.value ?? 0,
      })),
      byPaymentMethod,
      byZone,
      topProducts,
      byCategory,
      bySize,
      byColor,
      coupons,
      customers: {
        total: customerRow.total,
        new: customerRow.new,
        returning: customerRow.total - customerRow.new,
      },
      generatedAt: now.toISOString(),
    };
  }

  private async totals(gte: Date, lt: Date): Promise<SalesTotals> {
    const [row] = await this.prisma.$queryRaw<SalesTotals[]>(Prisma.sql`
      select count(*)::int as orders,
             count(*) filter (where ${VALID})::int as "validOrders",
             coalesce(sum(o.total) filter (where ${VALID}), 0)::int as "grossSales",
             coalesce(sum(o.total) filter (where ${REALISED}), 0)::int as revenue,
             coalesce(sum(o.total) filter (where ${OPEN_UNPAID}), 0)::int as pending,
             coalesce(sum(o.discount) filter (where ${VALID}), 0)::int as discount,
             coalesce(sum(o."deliveryCharge") filter (where ${VALID}), 0)::int as "deliveryCharges",
             coalesce((
               select sum(oi.quantity) from "OrderItem" oi where oi."orderId" in (
                 select o2.id from "Order" o2
                  where o2."createdAt" >= ${gte} and o2."createdAt" < ${lt}
                    and o2.status not in ('CANCELLED', 'RETURNED'))
             ), 0)::int as "unitsSold",
             count(*) filter (where o.status = 'DELIVERED')::int as delivered,
             count(*) filter (where o.status = 'CANCELLED')::int as cancelled,
             count(*) filter (where o.status = 'RETURNED')::int as returned
        from "Order" o
       where o."createdAt" >= ${gte} and o."createdAt" < ${lt}`);
    return row ?? EMPTY_TOTALS;
  }
}
