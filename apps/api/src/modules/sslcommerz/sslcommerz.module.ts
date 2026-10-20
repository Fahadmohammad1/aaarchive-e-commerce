import { Global, Module } from "@nestjs/common";
import { SslcommerzClient } from "./sslcommerz.client.js";
import { SslcommerzController } from "./sslcommerz.controller.js";
import { SslcommerzService } from "./sslcommerz.service.js";

/** Online payment (owner, 2026-10-21). Global: orders and settings use it. */
@Global()
@Module({
  controllers: [SslcommerzController],
  providers: [SslcommerzClient, SslcommerzService],
  exports: [SslcommerzService],
})
export class SslcommerzModule {}
