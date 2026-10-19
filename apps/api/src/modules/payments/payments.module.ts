import { Module } from "@nestjs/common";
import { AdminPaymentsController } from "./admin-payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsExportService } from "./payments-export.service.js";

@Module({
  controllers: [AdminPaymentsController],
  providers: [PaymentsService, PaymentsExportService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
