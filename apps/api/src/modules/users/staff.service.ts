import type {
  staffCreateSchema,
  staffUpdateSchema,
} from "@aaarchive/shared/auth";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { hash } from "@node-rs/argon2";
import type { z } from "zod";
import type { RequestUser } from "../../common/auth/request-user.js";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import type { User } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { checkNewPassword } from "../auth/password-policy.js";
import { TokenService } from "../auth/token.service.js";

type CreateInput = z.output<typeof staffCreateSchema>;
type UpdateInput = z.output<typeof staffUpdateSchema>;

function toStaff(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as "OWNER" | "STAFF",
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * Dashboard accounts (PRD §6.8, Owner only). The Owner creates an account
 * with a first password and shares it in person; no email invite needed.
 * Deactivating, changing the role or setting a password ends that person's
 * sessions at once (tokenVersion + refresh tokens, rules.md §8.2).
 */
@Injectable()
export class StaffService {
  private readonly logger = new Logger("Security");

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async list() {
    const rows = await this.prisma.user.findMany({
      where: { role: { in: ["OWNER", "STAFF"] } },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    });
    return { data: rows.map(toStaff) };
  }

  async create(input: CreateInput, actor: RequestUser) {
    const problem = checkNewPassword(input.password, input.email);
    if (problem) throw passwordError(problem);
    try {
      const user = await this.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: await hash(input.password),
        },
      });
      this.logger.log(
        `Account ${user.id} (${user.role}) created by ${actor.id}`,
      );
      return toStaff(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: "An account with this email already exists",
          code: "EMAIL_TAKEN",
        });
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateInput, actor: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      throw new NotFoundException({
        message: "Account not found",
        code: "NOT_FOUND",
      });
    }
    const self = user.id === actor.id;
    const demoting = input.role !== undefined && input.role !== user.role;
    const deactivating = input.isActive === false && user.isActive;
    if (self && (demoting || deactivating)) {
      throw new ConflictException({
        message: "You cannot change your own role or switch yourself off",
        code: "CANNOT_CHANGE_SELF",
      });
    }
    // Never leave the store without an active Owner.
    if (user.role === "OWNER" && (demoting || deactivating)) {
      const owners = await this.prisma.user.count({
        where: { role: "OWNER", isActive: true, id: { not: id } },
      });
      if (owners === 0) {
        throw new ConflictException({
          message: "The store needs at least one active owner",
          code: "LAST_OWNER",
        });
      }
    }
    if (input.password) {
      const problem = checkNewPassword(input.password, user.email);
      if (problem) throw passwordError(problem);
    }
    const endSessions =
      demoting ||
      deactivating ||
      Boolean(input.password) ||
      (input.isActive === true && !user.isActive);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.password
          ? {
              passwordHash: await hash(input.password),
              failedLoginCount: 0,
              lockedUntil: null,
            }
          : {}),
        ...(endSessions ? { tokenVersion: { increment: 1 } } : {}),
      },
    });
    if (endSessions) await this.tokens.revokeAllForUser(id);
    this.logger.log(
      `Account ${id} updated by ${actor.id}: ${Object.keys(input)
        .filter((k) => k !== "password")
        .concat(input.password ? ["password"] : [])
        .join(", ")}`,
    );
    return toStaff(updated);
  }
}

function passwordError(code: string) {
  return new BadRequestException({
    message: "Choose a stronger password",
    code: "VALIDATION_ERROR",
    details: { fieldErrors: { password: [code] } },
  });
}
