"use client";

import { FormField } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, getMessages } from "@/lib/i18n/i18n";
import type { ProductForm } from "./product-form-types";

export function SeoTab({ form }: { form: ProductForm }) {
  const tf = getMessages().admin.products.fields;
  const { errors } = form.formState;
  const [title, desc] = form.watch(["seoTitle", "seoDesc"]);

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <FormField
        id="p-seo-title"
        label={`${tf.seoTitle} · ${format(tf.characters, { count: (title ?? "").length, max: 70 })}`}
        hint={format(tf.seoHint, { value: tf.seoAuto })}
        error={errors.seoTitle?.message}
      >
        <Input
          id="p-seo-title"
          maxLength={70}
          aria-invalid={Boolean(errors.seoTitle)}
          {...form.register("seoTitle")}
        />
      </FormField>
      <FormField
        id="p-seo-desc"
        label={`${tf.seoDesc} · ${format(tf.characters, { count: (desc ?? "").length, max: 160 })}`}
        hint={format(tf.seoHint, { value: tf.seoAutoDesc })}
        error={errors.seoDesc?.message}
      >
        <Textarea
          id="p-seo-desc"
          rows={3}
          maxLength={160}
          aria-invalid={Boolean(errors.seoDesc)}
          {...form.register("seoDesc")}
        />
      </FormField>
    </div>
  );
}
