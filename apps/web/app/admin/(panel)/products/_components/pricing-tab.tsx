"use client";

import { isSaleActive } from "@aaarchive/shared/product";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@aaarchive/shared/stock";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { format, getMessages } from "@/lib/i18n/i18n";
import type { ProductForm } from "./product-form-types";
import {
  fromLocalInput,
  numberOrNull,
  toLocalInput,
} from "./product-form-values";

export function PricingTab({ form }: { form: ProductForm }) {
  const tf = getMessages().admin.products.fields;
  const { errors } = form.formState;
  const [basePrice, salePrice, saleStart, saleEnd] = form.watch([
    "basePrice",
    "salePrice",
    "saleStart",
    "saleEnd",
  ]);
  const saleNow =
    typeof basePrice === "number" &&
    isSaleActive({
      basePrice,
      salePrice: salePrice ?? null,
      saleStart: saleStart ?? null,
      saleEnd: saleEnd ?? null,
    });

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="p-price"
          label={tf.basePrice}
          error={errors.basePrice?.message}
        >
          <Input
            id="p-price"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="font-mono"
            aria-invalid={Boolean(errors.basePrice)}
            {...form.register("basePrice", { setValueAs: numberOrNull })}
          />
        </FormField>
        <FormField
          id="p-sale"
          label={tf.salePrice}
          hint={tf.salePriceHint}
          error={errors.salePrice?.message}
        >
          <Input
            id="p-sale"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            className="font-mono"
            aria-invalid={Boolean(errors.salePrice)}
            {...form.register("salePrice", { setValueAs: numberOrNull })}
          />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {(["saleStart", "saleEnd"] as const).map((name) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormField
                id={`p-${name}`}
                label={name === "saleStart" ? tf.saleStart : tf.saleEnd}
                error={errors[name]?.message}
              >
                <Input
                  id={`p-${name}`}
                  type="datetime-local"
                  className="font-mono"
                  value={toLocalInput(field.value)}
                  onChange={(e) =>
                    field.onChange(fromLocalInput(e.target.value))
                  }
                  onBlur={field.onBlur}
                  aria-invalid={Boolean(errors[name])}
                />
              </FormField>
            )}
          />
        ))}
      </div>
      <p className="-mt-2 text-muted-foreground text-xs">{tf.saleWindowHint}</p>
      {saleNow && (
        <p className="text-primary text-sm" aria-live="polite">
          {tf.saleNow}
        </p>
      )}
      <FormField
        id="p-low"
        label={tf.lowStock}
        hint={format(tf.lowStockHint, { value: DEFAULT_LOW_STOCK_THRESHOLD })}
        error={errors.lowStockThreshold?.message}
      >
        <Input
          id="p-low"
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          className="w-28 font-mono"
          aria-invalid={Boolean(errors.lowStockThreshold)}
          {...form.register("lowStockThreshold", { setValueAs: numberOrNull })}
        />
      </FormField>
    </div>
  );
}
