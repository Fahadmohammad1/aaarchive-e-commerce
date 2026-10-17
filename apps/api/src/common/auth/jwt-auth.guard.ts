import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { JWT_AUDIENCE, JWT_ISSUER } from "../../modules/auth/auth.constants.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { IS_PUBLIC } from "./auth.decorators.js";
import type { AccessTokenPayload, RequestUser } from "./request-user.js";

/**
 * Global guard: every route needs a valid access token unless marked @Public().
 * The user is re-read from the database on each request, so deactivation,
 * logout-everywhere and role changes take effect immediately — not when the
 * 15-minute token expires.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger("Security");

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const token = /^Bearer (.+)$/.exec(
      request.header("authorization") ?? "",
    )?.[1];
    if (!token) throw unauthorized();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
    } catch {
      throw unauthorized();
    }

    const [user, liveSession] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          tokenVersion: true,
        },
      }),
      this.prisma.refreshToken.count({
        where: { familyId: payload.sid, userId: payload.sub, revokedAt: null },
      }),
    ]);
    if (
      !user?.isActive ||
      user.tokenVersion !== payload.tv ||
      liveSession === 0
    ) {
      this.logger.warn(
        `Rejected access token for user ${payload.sub} (revoked or inactive)`,
      );
      throw unauthorized();
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: payload.sid,
    };
    return true;
  }
}

function unauthorized() {
  return new UnauthorizedException({
    message: "Please sign in again",
    code: "UNAUTHORIZED",
  });
}
