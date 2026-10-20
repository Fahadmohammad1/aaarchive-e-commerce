import type {
  AccountOrderSummary,
  AccountProfile,
  ProfileUpdateInput,
} from "@aaarchive/shared/account";
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  type PublicOrder,
  publicOrderSelect,
  toPublicOrder,
} from "../orders/orders.mapper.js";
import { SettingsService } from "../settings/settings.service.js";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  emailVerifiedAt: true,
  passwordHash: true,
  googleId: true,
} as const;

/**
 * The signed-in customer's profile and orders (PRD §5.10). Every query is
 * scoped to the user; orders are shown in the same public shape as tracking
 * (masked phone, no address), whichever way they joined the account.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async profile(userId: string): Promise<AccountProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: profileSelect,
    });
    return toProfile(user);
  }

  async updateProfile(
    userId: string,
    input: ProfileUpdateInput,
  ): Promise<AccountProfile> {
    const user = await this.prisma.user
      .update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.phone !== undefined && { phone: input.phone }),
        },
        select: profileSelect,
      })
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) {
          throw new ConflictException({
            message: "Another account uses this phone number",
            code: "PHONE_TAKEN",
            details: { fieldErrors: { phone: ["PHONE_TAKEN"] } },
          });
        }
        throw error;
      });
    return toProfile(user);
  }

  async orders(userId: string, page: number, limit: number) {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          orderNumber: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    const data: AccountOrderSummary[] = rows.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      total: o.total,
      itemCount: o._count.items,
    }));
    return { data, meta: { page, limit, total } };
  }

  async order(userId: string, orderNumber: string): Promise<PublicOrder> {
    const row = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      select: publicOrderSelect,
    });
    if (!row) throw orderNotFound();
    const { couriers } = await this.settings.couriers();
    return toPublicOrder(row, couriers);
  }

  /**
   * Links a guest order with phone + order number, the same proof tracking
   * asks for. An order already in another account answers like a wrong
   * number, so accounts cannot be probed.
   */
  async claim(
    userId: string,
    input: { phone: string; orderNumber: string },
  ): Promise<PublicOrder> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber: input.orderNumber, phone: input.phone },
      select: { id: true, userId: true },
    });
    if (!order || (order.userId && order.userId !== userId))
      throw orderNotFound();
    if (!order.userId) {
      const { count } = await this.prisma.order.updateMany({
        where: { id: order.id, userId: null },
        data: { userId },
      });
      if (count === 0) throw orderNotFound();
      this.logger.log(`Order ${input.orderNumber} claimed by ${userId}`);
    }
    return this.order(userId, input.orderNumber);
  }
}

function toProfile(user: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  googleId: string | null;
}): AccountProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    phone: user.phone,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    hasGoogle: user.googleId !== null,
  };
}

function orderNotFound() {
  return new NotFoundException({
    message: "No order matches this phone number and order number",
    code: "ORDER_NOT_FOUND",
  });
}
