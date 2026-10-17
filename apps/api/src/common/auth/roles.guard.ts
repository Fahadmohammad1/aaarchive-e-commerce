import { type Role, STAFF_ROLES } from "@aaarchive/shared/auth";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC, ROLES } from "./auth.decorators.js";
import type { RequestUser } from "./request-user.js";

/** Global guard, runs after JwtAuthGuard. Default: OWNER or STAFF only. */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger("Security");

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets))
      return true;

    const allowed = this.reflector.getAllAndOverride<Role[]>(
      ROLES,
      targets,
    ) ?? [...STAFF_ROLES];
    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      method: string;
      originalUrl: string;
    }>();
    const user = request.user;
    if (user && allowed.includes(user.role)) return true;

    this.logger.warn(
      `Forbidden: user ${user?.id ?? "?"} (${user?.role ?? "?"}) → ${request.method} ${request.originalUrl.split("?")[0]}`,
    );
    throw new ForbiddenException({
      message: "You do not have access to this",
      code: "FORBIDDEN",
    });
  }
}
