import { staffCreateSchema, staffUpdateSchema } from "@aaarchive/shared/auth";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { z } from "zod";
import { CurrentUser, Roles } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { StaffService } from "./staff.service.js";

/** Staff management (PRD §6.8). Owner only, every route. */
@Controller("admin/staff")
@UseGuards(SameOriginGuard)
@Roles("OWNER")
export class AdminStaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(staffCreateSchema))
    body: z.output<typeof staffCreateSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.staff.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(staffUpdateSchema))
    body: z.output<typeof staffUpdateSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.staff.update(id, body, user);
  }
}
