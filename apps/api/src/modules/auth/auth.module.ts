import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { Env } from "../../config/env.schema.js";
import { JWT_AUDIENCE, JWT_ISSUER } from "./auth.constants.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { TokenService } from "./token.service.js";
import { TotpService } from "./totp.service.js";
import { TurnstileService } from "./turnstile.service.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get("JWT_ACCESS_SECRET", { infer: true }),
        signOptions: {
          algorithm: "HS256",
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          expiresIn: config.get("ACCESS_TOKEN_TTL_SECONDS", { infer: true }),
        },
        verifyOptions: {
          algorithms: ["HS256"],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, TurnstileService, TotpService],
  exports: [AuthService, TokenService, TurnstileService],
})
export class AuthModule {}
