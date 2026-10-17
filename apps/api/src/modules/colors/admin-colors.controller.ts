import {
  catalogListQuerySchema,
  colorInputSchema,
  colorUpdateSchema,
} from "@aaarchive/shared/catalog";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { z } from "zod";
import { Roles } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ColorsService } from "./colors.service.js";

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/colors")
@UseGuards(SameOriginGuard)
export class AdminColorsController {
  constructor(private readonly colors: ColorsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(catalogListQuerySchema))
    query: z.output<typeof catalogListQuerySchema>,
  ) {
    return this.colors.list(query);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(colorInputSchema))
    body: z.output<typeof colorInputSchema>,
  ) {
    return this.colors.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(colorUpdateSchema))
    body: z.output<typeof colorUpdateSchema>,
  ) {
    return this.colors.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.colors.remove(id);
  }
}
