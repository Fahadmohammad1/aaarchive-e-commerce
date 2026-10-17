import {
  catalogListQuerySchema,
  sizeInputSchema,
  sizeUpdateSchema,
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
import { SizesService } from "./sizes.service.js";

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/sizes")
@UseGuards(SameOriginGuard)
export class AdminSizesController {
  constructor(private readonly sizes: SizesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(catalogListQuerySchema))
    query: z.output<typeof catalogListQuerySchema>,
  ) {
    return this.sizes.list(query);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(sizeInputSchema))
    body: z.output<typeof sizeInputSchema>,
  ) {
    return this.sizes.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sizeUpdateSchema))
    body: z.output<typeof sizeUpdateSchema>,
  ) {
    return this.sizes.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.sizes.remove(id);
  }
}
