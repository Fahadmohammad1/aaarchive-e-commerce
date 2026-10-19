"use client";

import type { MediaAsset } from "@aaarchive/shared/media";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
import { FormField } from "@/components/admin/form-field";
import { ImagePicker, type ImageValue } from "@/components/admin/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

// Building blocks for the content section forms (PRD §6.7). They work on any
// React Hook Form whose schema is one of contentSchemas.

/** Reads a nested error message ("hero.headline.0") from the form state. */
export function errorAt(
  form: UseFormReturn<FieldValues>,
  path: string,
): string | undefined {
  let node: unknown = form.formState.errors;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  const message = (node as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : undefined;
}

/** 1–3 heading lines ("The archive" / "index"). */
export function HeadingLinesField({
  form,
  name,
  label,
  max = 3,
}: {
  form: UseFormReturn<FieldValues>;
  name: string;
  label: string;
  max?: number;
}) {
  const t = getAdminMessages().content;
  const lines = (form.watch(name) as string[] | undefined) ?? [];
  const set = (next: string[]) =>
    form.setValue(name, next, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  const error = errorAt(form, name);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity beyond position
        <div key={i} className="flex gap-2">
          <Input
            aria-label={`${label} ${i + 1}`}
            value={line}
            maxLength={60}
            className="h-11 uppercase"
            aria-invalid={Boolean(errorAt(form, `${name}.${i}`))}
            onChange={(e) =>
              set(lines.map((l, j) => (j === i ? e.target.value : l)))
            }
          />
          {lines.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={format(t.removeLine, { index: i + 1 })}
              onClick={() => set(lines.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      ))}
      <p className="text-muted-foreground text-xs">{t.headingHint}</p>
      {error && (
        <p className="text-destructive text-xs">{fieldErrorText(error)}</p>
      )}
      {lines.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => set([...lines, ""])}
        >
          <Plus />
          {t.addLine}
        </Button>
      )}
    </fieldset>
  );
}

/** A list of { label, href } links. */
export function LinksField({
  form,
  name,
  label,
  hint,
  max,
}: {
  form: UseFormReturn<FieldValues>;
  name: string;
  label: string;
  hint?: string;
  max: number;
}) {
  const t = getAdminMessages().content;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: name as never,
  });
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      {fields.map((field, i) => {
        const labelError = errorAt(form, `${name}.${i}.label`);
        const hrefError = errorAt(form, `${name}.${i}.href`);
        return (
          <div
            key={field.id}
            className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
          >
            <div className="flex flex-col gap-1">
              <Input
                aria-label={`${t.linkLabel} ${i + 1}`}
                placeholder={t.linkLabel}
                maxLength={40}
                className="h-11"
                aria-invalid={Boolean(labelError)}
                {...form.register(`${name}.${i}.label`)}
              />
              {labelError && (
                <span className="text-destructive text-xs">
                  {fieldErrorText(labelError)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                aria-label={`${t.href} ${i + 1}`}
                placeholder="/shop"
                className="h-11 font-mono"
                aria-invalid={Boolean(hrefError)}
                {...form.register(`${name}.${i}.href`)}
              />
              {hrefError && (
                <span className="text-destructive text-xs">
                  {fieldErrorText(hrefError)}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={format(t.removeLink, { index: i + 1 })}
              onClick={() => remove(i)}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      {fields.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => append({ label: "", href: "" } as never)}
        >
          <Plus />
          {t.addLink}
        </Button>
      )}
    </fieldset>
  );
}

/** A content photo: upload or pick from the library, with alt text. */
export function ImageField({
  control,
  name,
  id,
  label,
  media,
  defaultAlt,
  error,
  onPreview,
}: {
  control: Control<FieldValues>;
  name: string;
  id: string;
  label: string;
  /** Assets the block already references, for the first preview. */
  media: Record<string, MediaAsset>;
  defaultAlt?: string;
  error?: string;
  /** Called with the newly chosen asset (e.g. to place hotspots on it). */
  onPreview?: (asset: MediaAsset | null) => void;
}) {
  const [preview, setPreview] = React.useState<MediaAsset | null>(null);
  return (
    <Controller
      control={control}
      name={name as Path<FieldValues>}
      render={({ field }) => {
        const value = (field.value as ImageValue | null | undefined) ?? null;
        return (
          <ImagePicker
            id={id}
            label={label}
            purpose="content"
            value={value}
            preview={preview ?? (value ? (media[value.mediaId] ?? null) : null)}
            defaultAlt={defaultAlt}
            altError={error}
            onChange={(next, asset) => {
              setPreview(asset);
              onPreview?.(asset);
              field.onChange(next);
            }}
          />
        );
      }}
    />
  );
}

/** Text input with label + inline error. */
export function TextField({
  form,
  name,
  id,
  label,
  hint,
  maxLength,
  textarea,
  mono,
}: {
  form: UseFormReturn<FieldValues>;
  name: string;
  id: string;
  label: string;
  hint?: string;
  maxLength: number;
  textarea?: boolean;
  mono?: boolean;
}) {
  const error = errorAt(form, name);
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      {textarea ? (
        <textarea
          id={id}
          rows={3}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
          {...form.register(name)}
        />
      ) : (
        <Input
          id={id}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          className={mono ? "h-11 font-mono" : "h-11"}
          {...form.register(name)}
        />
      )}
    </FormField>
  );
}
