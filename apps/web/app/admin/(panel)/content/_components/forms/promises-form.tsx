"use client";

import { PROMISE_ICONS } from "@aaarchive/shared/content";
import { Plus, Trash2 } from "lucide-react";
import {
  type FieldValues,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
import { NativeSelect } from "@/components/admin/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldErrorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { errorAt, HeadingLinesField, ImageField, TextField } from "../fields";
import { SectionShell } from "../section-shell";
import { useSectionForm } from "../use-section-form";
import type { SectionFormProps } from "./types";

type F = UseFormReturn<FieldValues>;

export function PromisesForm({ initial, media, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "home.promises",
    initial,
    {
      heading: [""],
      intro: "",
      image: null,
      items: [
        { icon: "fabric", title: "", text: "" },
        { icon: "delivery", title: "", text: "" },
      ],
    },
  );
  const items = useFieldArray({ control: form.control, name: "items" });
  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <HeadingLinesField form={form as F} name="heading" label={t.heading} />
      <TextField
        form={form as F}
        name="intro"
        id="pr-intro"
        label={t.intro}
        maxLength={240}
        textarea
      />
      <ImageField
        control={form.control}
        name="image"
        id="pr-image"
        label={t.image}
        media={media}
        error={errorAt(form as F, "image.alt") ?? errorAt(form as F, "image")}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium text-sm">{t.promises}</legend>
        {items.fields.map((field, i) => {
          const titleError = errorAt(form as F, `items.${i}.title`);
          const textError = errorAt(form as F, `items.${i}.text`);
          return (
            <div
              key={field.id}
              className="grid gap-2 rounded-md border p-3 sm:grid-cols-[9rem_1fr_auto]"
            >
              <NativeSelect
                aria-label={t.icon}
                {...form.register(`items.${i}.icon`)}
              >
                {PROMISE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {t.icons[icon]}
                  </option>
                ))}
              </NativeSelect>
              <div className="flex flex-col gap-2">
                <Input
                  aria-label={t.promiseTitle}
                  placeholder={t.promiseTitle}
                  maxLength={40}
                  className="h-11"
                  aria-invalid={Boolean(titleError)}
                  {...form.register(`items.${i}.title`)}
                />
                {titleError && (
                  <span className="text-destructive text-xs">
                    {fieldErrorText(titleError)}
                  </span>
                )}
                <Input
                  aria-label={t.promiseText}
                  placeholder={t.promiseText}
                  maxLength={140}
                  className="h-11"
                  aria-invalid={Boolean(textError)}
                  {...form.register(`items.${i}.text`)}
                />
                {textError && (
                  <span className="text-destructive text-xs">
                    {fieldErrorText(textError)}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                disabled={items.fields.length <= 2}
                aria-label={t.removeLine.replace("{index}", String(i + 1))}
                onClick={() => items.remove(i)}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        {items.fields.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              items.append({ icon: "quality", title: "", text: "" })
            }
          >
            <Plus />
            {t.addPromise}
          </Button>
        )}
      </fieldset>
    </SectionShell>
  );
}
