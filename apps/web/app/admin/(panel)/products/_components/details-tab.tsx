"use client";

import { PRODUCT_STATUSES } from "@aaarchive/shared/product";
import * as React from "react";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/admin/form-field";
import { NativeSelect } from "@/components/admin/native-select";
import { SwitchField } from "@/components/admin/switch-field";
import { RichText } from "@/components/store/rich-text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/lib/category/use-categories";
import { useCollections } from "@/lib/collection/use-collections";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { ProductForm } from "./product-form-types";
import { numberOrNull } from "./product-form-values";

export function DetailsTab({ form }: { form: ProductForm }) {
  const t = getAdminMessages();
  const tf = t.products.fields;
  const { errors } = form.formState;
  const categories = useCategories();
  const collections = useCollections();
  const description = form.watch("description");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <FormField id="p-name" label={tf.name} error={errors.name?.message}>
          <Input
            id="p-name"
            autoComplete="off"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
        </FormField>
        <FormField
          id="p-slug"
          label={t.catalog.slug}
          hint={t.catalog.slugHint}
          error={errors.slug?.message}
        >
          <Input
            id="p-slug"
            autoComplete="off"
            maxLength={80}
            className="font-mono"
            aria-invalid={Boolean(errors.slug)}
            {...form.register("slug", {
              setValueAs: (v: string) => (v?.trim() ? v.trim() : undefined),
            })}
          />
        </FormField>
        <FormField
          id="p-short"
          label={tf.shortDesc}
          hint={tf.shortDescHint}
          error={errors.shortDesc?.message}
        >
          <Textarea
            id="p-short"
            rows={2}
            maxLength={300}
            aria-invalid={Boolean(errors.shortDesc)}
            {...form.register("shortDesc")}
          />
        </FormField>
        <FormField
          id="p-desc"
          label={tf.description}
          hint={tf.descriptionHint}
          error={errors.description?.message}
        >
          <Textarea
            id="p-desc"
            rows={8}
            maxLength={10_000}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
        </FormField>
        <RichTextPreview source={description ?? ""} />
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <FormField
            id="p-fabric"
            label={tf.fabric}
            error={errors.fabric?.message}
          >
            <Input id="p-fabric" maxLength={120} {...form.register("fabric")} />
          </FormField>
          <FormField id="p-gsm" label={tf.gsm} error={errors.gsm?.message}>
            <Input
              id="p-gsm"
              type="number"
              inputMode="numeric"
              min={50}
              max={1000}
              className="font-mono"
              aria-invalid={Boolean(errors.gsm)}
              {...form.register("gsm", { setValueAs: numberOrNull })}
            />
          </FormField>
        </div>
        <FormField id="p-care" label={tf.care} error={errors.care?.message}>
          <Textarea
            id="p-care"
            rows={3}
            maxLength={1000}
            {...form.register("care")}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-5">
        <FormField
          id="p-status"
          label={tf.status}
          hint={tf.statusHint}
          error={errors.status?.message}
        >
          <NativeSelect id="p-status" {...form.register("status")}>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.products.status[s]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <Controller
          control={form.control}
          name="isFeatured"
          render={({ field }) => (
            <SwitchField
              id="p-featured"
              label={tf.featured}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FormField
          id="p-category"
          label={tf.category}
          error={errors.categoryId?.message}
        >
          <NativeSelect
            id="p-category"
            aria-invalid={Boolean(errors.categoryId)}
            {...form.register("categoryId")}
          >
            <option value="">{tf.chooseCategory}</option>
            {categories.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <Controller
          control={form.control}
          name="collectionIds"
          render={({ field }) => {
            const value = field.value ?? [];
            const list = collections.data?.data ?? [];
            return (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-medium text-sm">
                  {tf.collections}
                </legend>
                {list.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {tf.noCollections}
                  </p>
                ) : (
                  list.map((c) => (
                    <label
                      key={c.id}
                      className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={value.includes(c.id)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked
                              ? [...value, c.id]
                              : value.filter((id) => id !== c.id),
                          )
                        }
                      />
                      {c.name}
                      {!c.isActive && (
                        <span className="text-muted-foreground text-xs">
                          ({t.catalog.hidden})
                        </span>
                      )}
                    </label>
                  ))
                )}
              </fieldset>
            );
          }}
        />
        <Controller
          control={form.control}
          name="tags"
          render={({ field }) => (
            <TagsInput
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.tags?.message ?? firstTagError(errors.tags)}
            />
          )}
        />
      </div>
    </div>
  );
}

function firstTagError(node: unknown): string | undefined {
  if (!Array.isArray(node)) return undefined;
  return node.find((e) => e?.message)?.message;
}

/** Comma-separated text, kept as typed; the form value is the parsed list. */
function TagsInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const tf = getAdminMessages().products.fields;
  const [text, setText] = React.useState(value.join(", "));
  const joined = value.join(", ");
  // Follow outside resets (e.g. after save) without fighting the typing.
  const last = React.useRef(joined);
  React.useEffect(() => {
    if (joined !== last.current) setText(joined);
    last.current = joined;
  }, [joined]);
  return (
    <FormField id="p-tags" label={tf.tags} hint={tf.tagsHint} error={error}>
      <Input
        id="p-tags"
        value={text}
        maxLength={700}
        aria-invalid={Boolean(error)}
        onChange={(e) => {
          setText(e.target.value);
          const tags = e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          last.current = tags.join(", ");
          onChange(tags);
        }}
      />
    </FormField>
  );
}

/** How the storefront will lay out the Markdown-lite description. */
function RichTextPreview({ source }: { source: string }) {
  const tf = getAdminMessages().products.fields;
  return (
    <details className="rounded-md border px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none font-medium text-muted-foreground text-xs">
        {tf.preview}
      </summary>
      <div className="mt-2">
        {source.trim() ? (
          <RichText source={source} />
        ) : (
          <p className="text-muted-foreground">{tf.previewEmpty}</p>
        )}
      </div>
    </details>
  );
}
