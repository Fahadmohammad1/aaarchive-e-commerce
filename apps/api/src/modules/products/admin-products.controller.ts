import {
  adminProductListQuerySchema,
  productExportQuerySchema,
  productInputSchema,
  productUpdateSchema,
  variantBulkUpdateSchema,
  variantGenerateSchema,
} from "@aaarchive/shared/product";
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
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { z } from "zod";
import { Roles } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import { ProductsService } from "./products.service.js";
import { ProductsExportService } from "./products-export.service.js";
import { VariantsService } from "./variants.service.js";

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/products")
@UseGuards(SameOriginGuard)
export class AdminProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly variants: VariantsService,
    private readonly exports: ProductsExportService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminProductListQuerySchema))
    query: z.output<typeof adminProductListQuerySchema>,
  ) {
    return this.products.list(query);
  }

  /**
   * Products & stock as CSV/Excel, same filters as the list. Owner only
   * (PRD §6.9 rule 2). Declared before ":id" so "export" is not an id.
   */
  @Get("export")
  @Roles("OWNER")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  export(
    @Query(new ZodValidationPipe(productExportQuerySchema))
    query: z.output<typeof productExportQuerySchema>,
    @Res() res: Response,
  ) {
    return this.exports.export(res, query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.products.get(id);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(productInputSchema))
    body: z.output<typeof productInputSchema>,
  ) {
    return this.products.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(productUpdateSchema))
    body: z.output<typeof productUpdateSchema>,
  ) {
    return this.products.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.products.remove(id);
  }

  @Post(":id/duplicate")
  @Roles("OWNER")
  duplicate(@Param("id") id: string) {
    return this.products.duplicate(id);
  }

  /** Generates the missing size × colour variants; returns the product. */
  @Post(":id/variants")
  @Roles("OWNER")
  generateVariants(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(variantGenerateSchema))
    body: z.output<typeof variantGenerateSchema>,
  ) {
    return this.variants.generate(id, body);
  }

  /** Quick stock edit and variant details (all or nothing); returns the product. */
  @Patch(":id/variants")
  @Roles("OWNER")
  updateVariants(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(variantBulkUpdateSchema))
    body: z.output<typeof variantBulkUpdateSchema>,
  ) {
    return this.variants.update(id, body);
  }

  @Delete(":id/variants/:variantId")
  @Roles("OWNER")
  removeVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
  ) {
    return this.variants.remove(id, variantId);
  }
}
