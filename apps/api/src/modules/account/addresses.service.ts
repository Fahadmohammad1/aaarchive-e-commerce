import {
  type AddressInput,
  MAX_SAVED_ADDRESSES,
  type SavedAddress,
} from "@aaarchive/shared/account";
import type { BdDistrict } from "@aaarchive/shared/checkout";
import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

const addressSelect = {
  id: true,
  name: true,
  phone: true,
  district: true,
  area: true,
  address: true,
  isDefault: true,
  zone: { select: { id: true, name: true } },
} as const satisfies Prisma.AddressSelect;
type AddressRow = Prisma.AddressGetPayload<{ select: typeof addressSelect }>;

function toSavedAddress(row: AddressRow): SavedAddress {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    zone: { id: row.zone.id, name: row.zone.name },
    district: row.district as BdDistrict,
    area: row.area,
    address: row.address,
    isDefault: row.isDefault,
  };
}

type Values = Omit<AddressInput, "isDefault"> & { isDefault: boolean };

/**
 * A customer's saved delivery addresses (PRD §5.10), used to fill checkout.
 * Every query is scoped to the owner, so an id from someone else is a 404.
 * Exactly one address is the default whenever any exist.
 */
@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<SavedAddress[]> {
    const rows = await this.prisma.address.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toSavedAddress);
  }

  async create(userId: string, input: Values): Promise<SavedAddress> {
    await this.assertZone(input.zoneId);
    const row = await this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      if (count >= MAX_SAVED_ADDRESSES) throw addressLimit();
      const isDefault = input.isDefault || count === 0;
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: { ...fields(input), userId, isDefault },
        select: addressSelect,
      });
    });
    return toSavedAddress(row);
  }

  async update(
    userId: string,
    id: string,
    input: Values,
  ): Promise<SavedAddress> {
    await this.assertZone(input.zoneId);
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.address.findFirst({
        where: { id, userId },
        select: { isDefault: true },
      });
      if (!current) throw notFound();
      // The default can move to another address, not simply be switched off.
      const isDefault = input.isDefault || current.isDefault;
      if (isDefault && !current.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: { ...fields(input), isDefault },
        select: addressSelect,
      });
    });
    return toSavedAddress(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.address.findFirst({
        where: { id, userId },
        select: { isDefault: true },
      });
      if (!current) throw notFound();
      await tx.address.delete({ where: { id } });
      if (current.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }

  /**
   * After a signed-in checkout with "save this address": keeps it unless the
   * same address is already saved or the list is full. Never throws.
   */
  async saveFromCheckout(userId: string, input: Values): Promise<void> {
    try {
      const existing = await this.prisma.address.findMany({
        where: { userId },
        select: {
          name: true,
          phone: true,
          zoneId: true,
          district: true,
          area: true,
          address: true,
        },
      });
      const same = existing.some(
        (a) =>
          a.phone === input.phone &&
          a.zoneId === input.zoneId &&
          a.district === input.district &&
          a.area.toLowerCase() === input.area.trim().toLowerCase() &&
          a.address.toLowerCase() === input.address.trim().toLowerCase(),
      );
      if (same || existing.length >= MAX_SAVED_ADDRESSES) return;
      await this.create(userId, input);
    } catch (error) {
      this.logger.error(
        `Saving the checkout address for ${userId} failed: ${String(error)}`,
      );
    }
  }

  private async assertZone(zoneId: string) {
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { id: zoneId, isActive: true },
      select: { id: true },
    });
    if (!zone) {
      throw new UnprocessableEntityException({
        message: "Please choose a delivery zone",
        code: "ZONE_UNAVAILABLE",
        details: { fieldErrors: { zoneId: ["ZONE_UNAVAILABLE"] } },
      });
    }
  }
}

function fields(input: Values) {
  return {
    name: input.name.trim(),
    phone: input.phone,
    zoneId: input.zoneId,
    district: input.district,
    area: input.area.trim(),
    address: input.address.trim(),
  };
}

function notFound() {
  return new NotFoundException({
    message: "Address not found",
    code: "NOT_FOUND",
  });
}

function addressLimit() {
  return new UnprocessableEntityException({
    message: `You can save up to ${MAX_SAVED_ADDRESSES} addresses`,
    code: "ADDRESS_LIMIT",
    details: { max: MAX_SAVED_ADDRESSES },
  });
}
