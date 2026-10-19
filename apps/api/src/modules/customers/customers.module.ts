import { Module } from "@nestjs/common";
import {
  AdminBlockedPhonesController,
  AdminCustomersController,
} from "./admin-customers.controller.js";
import { CustomersService } from "./customers.service.js";
import { CustomersExportService } from "./customers-export.service.js";

@Module({
  controllers: [AdminCustomersController, AdminBlockedPhonesController],
  providers: [CustomersService, CustomersExportService],
})
export class CustomersModule {}
