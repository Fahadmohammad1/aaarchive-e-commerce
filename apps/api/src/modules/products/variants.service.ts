import { cacheTags } from "@aaarchive/shared/cache-tags";
import {
  missingVariantPairs,
  skuFor,
  type variantBulkUpdateSchema,
  type variantGenerateSchema,
} from "@aaarchive/shared/product";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import type { AdminProduct } from "./products.mapper.js";
import { ProductsService } from "./products.service.js";
import { uniqueSkus } from "./sku.js";

type GenerateInput = z.output<typeof variantGenerateSchema>;
type BulkInput = z.output<typeof variantBulkUpdateSchema>;

export const MAX_VARIANTS_PER_PRODUCT = 200;

/** Variants (PRD §6.2): size × colour, SKU, stock, price override, active. */
@Injectable()
export class VariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly revalidation: RevalidationService,
  ) {}

  /** Adds the size × colour pairs the product does not have yet. */
  async generate(
    productId: string,
    input: GenerateInput,
  ): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        slug: true,
        variants: { select: { sizeId: true, colorId: true } },
      },
    });
    if (!product) throw productNotFound();
    const [sizes, colors] = await Promise.all([
      this.prisma.size.findMany({ where: { id: { in: input.sizeIds } } }),
      this.prisma.color.findMany({ where: { id: { in: input.colorIds } } }),
    ]);
    if (sizes.length !== new Set(input.sizeIds).size) {
      throw badRequest("SIZE_NOT_FOUND");
    }
    if (colors.length !== new Set(input.colorIds).size) {
      throw badRequest("COLOR_NOT_FOUND");
    }
    const pairs = missingVariantPairs(
      input.sizeIds,
      input.colorIds,
      product.variants,
    );
    if (product.variants.length + pairs.length > MAX_VARIANTS_PER_PRODUCT) {
      throw badRequest("TOO_MANY_VARIANTS");
    }
    if (pairs.length > 0) {
      const sizeName = new Map(sizes.map((s) => [s.id, s.name]));
      const colorName = new Map(colors.map((c) => [c.id, c.name]));
      await this.prisma
        .$transaction(async (tx) => {
          const skus = await uniqueSkus(
            tx,
            pairs.map((p) =>
              skuFor(
                product.slug,
                sizeName.get(p.sizeId) ?? "",
                colorName.get(p.colorId) ?? "",
              ),
            ),
          );
          await tx.variant.createMany({
            data: pairs.map((p, i) => ({
              productId,
              sizeId: p.sizeId,
              colorId: p.colorId,
              sku: skus[i] as string,
              stock: input.stock,
            })),
          });
        })
        .catch(rethrowSkuTaken);
      void this.revalidate(product.slug);
    }
    return this.products.get(productId);
  }

  /**
   * Quick stock edit and variant details in one transaction: all rows save or
   * none do. A stock edit with `expectedStock` only applies while the stock
   * is still that number, so an order placed meanwhile is never overwritten.
   */
  async update(productId: string, input: BulkInput): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    if (!product) throw productNotFound();
    await this.prisma
      .$transaction(async (tx) => {
        const owned = await tx.variant.count({
          where: { productId, id: { in: input.variants.map((v) => v.id) } },
        });
        if (owned !== input.variants.length) throw variantNotFound();
        for (const v of input.variants) {
          const data = {
            sku: v.sku,
            stock: v.stock,
            priceOverride: v.priceOverride,
            isActive: v.isActive,
          };
          const guard =
            v.stock !== undefined && v.expectedStock !== undefined
              ? { stock: v.expectedStock }
              : {};
          const { count } = await tx.variant.updateMany({
            where: { id: v.id, productId, ...guard },
            data,
          });
          if (count === 0) {
            throw new ConflictException({
              message: "Stock changed since you opened this product",
              code: "STOCK_CHANGED",
              details: { variantId: v.id },
            });
          }
        }
      })
      .catch(rethrowSkuTaken);
    void this.revalidate(product.slug);
    return this.products.get(productId);
  }

  /** Ordered variants are kept for order history: deactivate them instead. */
  async remove(productId: string, variantId: string): Promise<AdminProduct> {
    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, productId },
      select: {
        product: { select: { slug: true } },
        _count: { select: { orderItems: true } },
      },
    });
    if (!variant) throw variantNotFound();
    if (variant._count.orderItems > 0) {
      throw new ConflictException({
        message: "This variant has orders. Deactivate it instead.",
        code: "VARIANT_HAS_ORDERS",
      });
    }
    await this.prisma.variant.delete({ where: { id: variantId } });
    void this.revalidate(variant.product.slug);
    return this.products.get(productId);
  }

  private revalidate(slug: string) {
    return this.revalidation.revalidate([
      cacheTags.products,
      cacheTags.product(slug),
      cacheTags.home,
    ]);
  }
}

function productNotFound() {
  return new NotFoundException({
    message: "Product not found",
    code: "NOT_FOUND",
  });
}

function variantNotFound() {
  return new NotFoundException({
    message: "Variant not found",
    code: "NOT_FOUND",
  });
}

function badRequest(code: string) {
  return new BadRequestException({
    message: "The variants could not be saved",
    code,
  });
}

function rethrowSkuTaken(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException({
      message: "Another variant already uses this SKU",
      code: "SKU_TAKEN",
    });
  }
  throw error;
}
