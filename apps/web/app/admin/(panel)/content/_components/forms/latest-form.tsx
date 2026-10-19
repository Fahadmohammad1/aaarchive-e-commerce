"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  type FieldValues,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
import { NativeSelect } from "@/components/admin/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/lib/category/use-categories";
import { fieldErrorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { errorAt, HeadingLinesField, ImageField, TextField } from "../fields";
import { SectionShell } from "../section-shell";
import { useSectionForm } from "../use-section-form";
import type { SectionFormProps } from "./types";

type F = UseFormReturn<FieldValues>;

export function LatestForm({ initial, media, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const categories = useCategories();
  const { form, submit, saving, message } = useSectionForm(
    "home.latest",
    initial,
    {
      heading: [""],
      intro: "",
      tabs: [{ label: "New in", value: "new" }],
      campaign: { tag: "", title: [""], text: "", image: null, href: "/shop" },
    },
  );
  const tabs = useFieldArray({ control: form.control, name: "tabs" });
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
        id="lt-intro"
        label={t.intro}
        maxLength={240}
        textarea
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">{t.tabs}</legend>
        <p className="text-muted-foreground text-xs">{t.tabsHint}</p>
        {tabs.fields.map((field, i) => {
          const labelError = errorAt(form as F, `tabs.${i}.label`);
          return (
            <div
              key={field.id}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="flex flex-col gap-1">
                <Input
                  aria-label={t.label}
                  placeholder={t.label}
                  maxLength={24}
                  className="h-11"
                  aria-invalid={Boolean(labelError)}
                  {...form.register(`tabs.${i}.label`)}
                />
                {labelError && (
                  <span className="text-destructive text-xs">
                    {fieldErrorText(labelError)}
                  </span>
                )}
              </div>
              <NativeSelect
                aria-label={t.tabValue}
                {...form.register(`tabs.${i}.value`)}
              >
                <option value="new">{t.newIn}</option>
                {categories.data?.data.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                disabled={tabs.fields.length <= 1}
                aria-label={t.removeLine.replace("{index}", String(i + 1))}
                onClick={() => tabs.remove(i)}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        {tabs.fields.length < 8 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => tabs.append({ label: "", value: "new" })}
          >
            <Plus />
            {t.addTab}
          </Button>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-4 rounded-md border p-4">
        <legend className="px-1 font-medium text-sm">{t.campaign}</legend>
        <TextField
          form={form as F}
          name="campaign.tag"
          id="lt-tag"
          label={t.campaignTag}
          maxLength={24}
        />
        <HeadingLinesField
          form={form as F}
          name="campaign.title"
          label={t.campaignTitle}
        />
        <TextField
          form={form as F}
          name="campaign.text"
          id="lt-text"
          label={t.campaignText}
          maxLength={240}
          textarea
        />
        <ImageField
          control={form.control}
          name="campaign.image"
          id="lt-image"
          label={t.image}
          media={media}
          error={
            errorAt(form as F, "campaign.image.alt") ??
            errorAt(form as F, "campaign.image")
          }
        />
        <TextField
          form={form as F}
          name="campaign.href"
          id="lt-href"
          label={t.campaignHref}
          hint={t.hrefHint}
          maxLength={300}
          mono
        />
      </fieldset>
    </SectionShell>
  );
}
