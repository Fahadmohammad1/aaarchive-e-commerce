import {
  catalogListQuerySchema,
  categoryInputSchema,
  categoryUpdateSchema,
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
import { CategoriesService } from "./categories.service.js";

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/categories")
@UseGuards(SameOriginGuard)
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(catalogListQuerySchema))
    query: z.output<typeof catalogListQuerySchema>,
  ) {
    return this.categories.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.categories.get(id);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(categoryInputSchema))
    body: z.output<typeof categoryInputSchema>,
  ) {
    return this.categories.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(categoryUpdateSchema))
    body: z.output<typeof categoryUpdateSchema>,
  ) {
    return this.categories.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.categories.remove(id);
  }
}
