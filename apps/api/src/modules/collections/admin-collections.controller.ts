import {
  catalogListQuerySchema,
  collectionInputSchema,
  collectionUpdateSchema,
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
import { CollectionsService } from "./collections.service.js";

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/collections")
@UseGuards(SameOriginGuard)
export class AdminCollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(catalogListQuerySchema))
    query: z.output<typeof catalogListQuerySchema>,
  ) {
    return this.collections.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.collections.get(id);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(collectionInputSchema))
    body: z.output<typeof collectionInputSchema>,
  ) {
    return this.collections.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(collectionUpdateSchema))
    body: z.output<typeof collectionUpdateSchema>,
  ) {
    return this.collections.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.collections.remove(id);
  }
}
