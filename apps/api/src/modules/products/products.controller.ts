import {
  storeProductListQuerySchema,
  storeSearchQuerySchema,
} from "@aaarchive/shared/storefront";
import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { z } from "zod";
import { Public } from "../../common/auth/auth.decorators.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { StoreProductsService } from "./store-products.service.js";

const scopeSchema = z.strictObject({
  category: z.string().trim().min(1).max(80).optional(),
  collection: z.string().trim().min(1).max(80).optional(),
});

/** Public catalog (PRD §5.3–5.5). Responses carry stock *status* only. */
@Public()
@Controller("products")
export class ProductsController {
  constructor(private readonly store: StoreProductsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(storeProductListQuerySchema))
    query: z.output<typeof storeProductListQuerySchema>,
  ) {
    return this.store.list(query);
  }

  /** Declared before ":slug" so "filters" is not a slug. */
  @Get("filters")
  filters(
    @Query(new ZodValidationPipe(scopeSchema))
    scope: z.output<typeof scopeSchema>,
  ) {
    return this.store.filters(scope);
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.store.get(slug);
  }

  /** The only uncached product read: current status per variant. */
  @Get(":slug/stock")
  @Header("Cache-Control", "no-store")
  stock(@Param("slug") slug: string) {
    return this.store.stock(slug);
  }
}

/** GET /search (PRD §5.4). */
@Public()
@Controller("search")
export class SearchController {
  constructor(private readonly store: StoreProductsService) {}

  @Get()
  search(
    @Query(new ZodValidationPipe(storeSearchQuerySchema))
    query: z.output<typeof storeSearchQuerySchema>,
  ) {
    return this.store.search(query);
  }
}
