import {
  catalogListQuerySchema,
  sizeChartInputSchema,
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
import { SizeChartsService } from "./size-charts.service.js";

type SizeChartBody = z.output<typeof sizeChartInputSchema>;

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/size-charts")
@UseGuards(SameOriginGuard)
export class AdminSizeChartsController {
  constructor(private readonly sizeCharts: SizeChartsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(catalogListQuerySchema))
    query: z.output<typeof catalogListQuerySchema>,
  ) {
    return this.sizeCharts.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.sizeCharts.get(id);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(sizeChartInputSchema)) body: SizeChartBody,
  ) {
    return this.sizeCharts.create(body);
  }

  /** Whole chart: columns and rows are only valid together. */
  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sizeChartInputSchema)) body: SizeChartBody,
  ) {
    return this.sizeCharts.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.sizeCharts.remove(id);
  }
}
