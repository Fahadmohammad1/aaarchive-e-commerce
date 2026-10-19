import type {
  deliveryZoneInputSchema,
  deliveryZoneUpdateSchema,
} from "@aaarchive/shared/delivery";
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

type CreateInput = z.output<typeof deliveryZoneInputSchema>;
type UpdateInput = z.output<typeof deliveryZoneUpdateSchema>;

export type AdminDeliveryZone = {
  id: string;
  name: string;
  charge: number;
  estimatedDays: string;
  sortOrder: number;
  isActive: boolean;
  orderCount: number;
  updatedAt: string;
};

export type StoreDeliveryZone = {
  id: string;
  name: string;
  charge: number;
  estimatedDays: string;
};

const include = { _count: { select: { orders: true } } } as const;
const orderBy = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

function toAdmin(row: {
  id: string;
  name: string;
  charge: number;
  estimatedDays: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: Date;
  _count: { orders: number };
}): AdminDeliveryZone {
  return {
    id: row.id,
    name: row.name,
    charge: row.charge,
    estimatedDays: row.estimatedDays,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    orderCount: row._count.orders,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Delivery zones and their charges (PRD §5.8, §6.8). */
@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active zones for checkout, in the admin's order. */
  async listActive(): Promise<StoreDeliveryZone[]> {
    const rows = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      select: { id: true, name: true, charge: true, estimatedDays: true },
      orderBy,
    });
    return rows.map((z) => ({
      id: z.id,
      name: z.name,
      charge: z.charge,
      estimatedDays: z.estimatedDays,
    }));
  }

  /** An active zone, or null — checkout refuses anything else. */
  findActive(id: string) {
    return this.prisma.deliveryZone.findFirst({
      where: { id, isActive: true },
      select: { id: true, name: true, charge: true, estimatedDays: true },
    });
  }

  async list() {
    const rows = await this.prisma.deliveryZone.findMany({ include, orderBy });
    return { data: rows.map(toAdmin) };
  }

  async create(input: CreateInput): Promise<AdminDeliveryZone> {
    const row = await this.prisma.deliveryZone
      .create({ data: input, include })
      .catch(rethrow);
    return toAdmin(row);
  }

  async update(id: string, input: UpdateInput): Promise<AdminDeliveryZone> {
    const row = await this.prisma.deliveryZone
      .update({ where: { id }, data: input, include })
      .catch(rethrow);
    return toAdmin(row);
  }

  /** Zones used by orders stay (orders point at them): switch them off instead. */
  async remove(id: string): Promise<void> {
    const used = await this.prisma.order.count({ where: { zoneId: id } });
    if (used > 0) {
      throw new ConflictException({
        message: "Orders use this zone; switch it off instead",
        code: "ZONE_IN_USE",
      });
    }
    await this.prisma.deliveryZone.delete({ where: { id } }).catch(rethrow);
  }
}

function rethrow(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException({
      message: "A zone with this name already exists",
      code: "NAME_TAKEN",
    });
  }
  if (isNotFound(error)) {
    throw new NotFoundException({
      message: "Delivery zone not found",
      code: "NOT_FOUND",
    });
  }
  throw error;
}
