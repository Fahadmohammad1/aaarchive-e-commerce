import type { Role } from "@aaarchive/shared/auth";
import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { RequestUser } from "./request-user.js";

export const IS_PUBLIC = "auth:isPublic";
export const ROLES = "auth:roles";

/** Opt a route out of authentication (storefront, health, login…). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Roles allowed on a route. Without it, an authenticated route is
 * OWNER/STAFF only — customers never reach admin routes by accident.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** The signed-in user, loaded fresh from the database by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser =>
    ctx.switchToHttp().getRequest<{ user: RequestUser }>().user,
);
