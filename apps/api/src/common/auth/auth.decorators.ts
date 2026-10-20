import type { Role } from "@aaarchive/shared/auth";
import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { RequestUser } from "./request-user.js";

export const IS_PUBLIC = "auth:isPublic";
export const OPTIONAL_AUTH = "auth:optional";
export const ROLES = "auth:roles";

/** Opt a route out of authentication (storefront, health, login…). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * On a @Public() route: attach `request.user` when a valid access token is
 * sent, and carry on as a guest when not (checkout links a signed-in
 * customer's order to the account). Never fails the request.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);

/**
 * Roles allowed on a route. Without it, an authenticated route is
 * OWNER/STAFF only — customers never reach admin routes by accident.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** The signed-in user, loaded fresh from the database by JwtAuthGuard. On an
 *  @OptionalAuth() route it may be undefined. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser =>
    ctx.switchToHttp().getRequest<{ user: RequestUser }>().user,
);
