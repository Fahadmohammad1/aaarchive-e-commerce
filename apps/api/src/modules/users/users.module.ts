import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AdminStaffController } from "./admin-staff.controller.js";
import { StaffService } from "./staff.service.js";

@Module({
  imports: [AuthModule],
  controllers: [AdminStaffController],
  providers: [StaffService],
})
export class UsersModule {}
