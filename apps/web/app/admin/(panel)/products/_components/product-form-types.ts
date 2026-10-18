import type { ProductValues } from "@aaarchive/shared/product";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormValues } from "./product-form-values";

export type ProductForm = UseFormReturn<
  ProductFormValues,
  unknown,
  ProductValues
>;
