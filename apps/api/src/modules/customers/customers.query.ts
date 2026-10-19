import { normalizeBdPhone } from "@aaarchive/shared/phone";
import { Prisma } from "../../generated/prisma/client.js";

// Customers = orders grouped by phone, guests included (PRD §6.5). Shared by
// the list and the export so both see the same rows.

export type CustomerFilters = { q?: string; blocked?: "1" | "0" };

export type CustomerRow = {
  phone: string;
  name: string;
  email: string | null;
  orders: number;
  delivered: number;
  failed: number;
  spent: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
  blocked: boolean;
};

function filterSql({ q, blocked }: CustomerFilters): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (q) {
    const digits = normalizeBdPhone(q) ?? q.replace(/\D/g, "");
    const byName = Prisma.sql`bool_or(o."customerName" ilike ${`%${q}%`})`;
    parts.push(
      digits.length >= 3
        ? Prisma.sql`(o.phone like ${`%${digits}%`} or ${byName})`
        : byName,
    );
  }
  if (blocked === "1") parts.push(Prisma.sql`bool_or(b.id is not null)`);
  if (blocked === "0") parts.push(Prisma.sql`bool_and(b.id is null)`);
  return parts.length
    ? Prisma.sql`having ${Prisma.join(parts, " and ")}`
    : Prisma.empty;
}

/** One row per phone; money is whole taka (delivered orders only count as spent). */
export function customersSql(
  filters: CustomerFilters,
  page?: { limit: number; offset: number },
): Prisma.Sql {
  return Prisma.sql`
    select o.phone,
           (array_agg(o."customerName" order by o."createdAt" desc))[1] as name,
           (array_agg(o.email order by o."createdAt" desc) filter (where o.email is not null))[1] as email,
           count(*)::int as orders,
           (count(*) filter (where o.status = 'DELIVERED'))::int as delivered,
           (count(*) filter (where o.status in ('CANCELLED', 'RETURNED')))::int as failed,
           coalesce(sum(o.total) filter (where o.status = 'DELIVERED'), 0)::int as spent,
           min(o."createdAt") as "firstOrderAt",
           max(o."createdAt") as "lastOrderAt",
           bool_or(b.id is not null) as blocked
      from "Order" o
      left join "BlockedPhone" b on b.phone = o.phone
     group by o.phone
     ${filterSql(filters)}
     order by max(o."createdAt") desc, o.phone
     ${page ? Prisma.sql`limit ${page.limit} offset ${page.offset}` : Prisma.empty}`;
}

export function customerCountSql(filters: CustomerFilters): Prisma.Sql {
  return Prisma.sql`
    select count(*)::int as n from (
      select o.phone
        from "Order" o
        left join "BlockedPhone" b on b.phone = o.phone
       group by o.phone
       ${filterSql(filters)}
    ) t`;
}
