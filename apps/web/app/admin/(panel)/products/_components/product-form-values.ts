import type { ProductInput } from "@aaarchive/shared/product";
import { toSizeChartTable } from "@/components/admin/size-chart-grid";
import type { AdminProduct } from "@/lib/product/product-schemas";

export type ProductFormValues = ProductInput;

export const PRODUCT_TABS = [
  "details",
  "pricing",
  "images",
  "variants",
  "sizeChart",
  "seo",
] as const;
export type ProductTab = (typeof PRODUCT_TABS)[number];

/** Which tab shows each field, to jump to the first error on save. */
export const FIELD_TAB: Record<string, ProductTab> = {
  name: "details",
  slug: "details",
  status: "details",
  isFeatured: "details",
  categoryId: "details",
  collectionIds: "details",
  tags: "details",
  shortDesc: "details",
  description: "details",
  fabric: "details",
  gsm: "details",
  care: "details",
  basePrice: "pricing",
  salePrice: "pricing",
  saleStart: "pricing",
  saleEnd: "pricing",
  lowStockThreshold: "pricing",
  images: "images",
  sizeChart: "sizeChart",
  seoTitle: "seo",
  seoDesc: "seo",
};

export function blankProduct(): ProductFormValues {
  return {
    name: "",
    shortDesc: "",
    description: "",
    fabric: "",
    gsm: null,
    care: "",
    tags: [],
    categoryId: "",
    collectionIds: [],
    basePrice: null as unknown as number,
    salePrice: null,
    saleStart: null,
    saleEnd: null,
    lowStockThreshold: null,
    sizeChart: { kind: "none" },
    images: [],
    status: "DRAFT",
    isFeatured: false,
    seoTitle: "",
    seoDesc: "",
  };
}

export function toFormValues(p: AdminProduct): ProductFormValues {
  return {
    name: p.name,
    slug: p.slug,
    shortDesc: p.shortDesc ?? "",
    description: p.description ?? "",
    fabric: p.fabric ?? "",
    gsm: p.gsm,
    care: p.care ?? "",
    tags: p.tags,
    categoryId: p.category.id,
    collectionIds: p.collections.map((c) => c.id),
    basePrice: p.basePrice,
    salePrice: p.salePrice,
    saleStart: p.saleStart,
    saleEnd: p.saleEnd,
    lowStockThreshold: p.lowStockThreshold,
    sizeChart:
      p.sizeChart.kind === "template"
        ? { kind: "template", sizeChartId: p.sizeChart.sizeChartId }
        : p.sizeChart.kind === "custom"
          ? { kind: "custom", table: toSizeChartTable(p.sizeChart.table) }
          : { kind: "none" },
    images: p.images.map((i) => ({
      mediaId: i.mediaId,
      alt: i.alt,
      colorId: i.colorId,
    })),
    status: p.status,
    isFeatured: p.isFeatured,
    seoTitle: p.seoTitle ?? "",
    seoDesc: p.seoDesc ?? "",
  };
}

/** "" → null, otherwise a number (NaN stays NaN so Zod reports it). */
export function numberOrNull(value: unknown): number | null {
  if (value === "" || value == null) return null;
  return Number(value);
}

/** ISO string → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
