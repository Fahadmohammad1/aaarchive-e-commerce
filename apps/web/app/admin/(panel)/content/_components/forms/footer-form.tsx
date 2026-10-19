"use client";

import { SOCIAL_LINK_PLATFORMS } from "@aaarchive/shared/content";
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
import { errorAt, ImageField, LinksField, TextField } from "../fields";
import { SectionShell } from "../section-shell";
import { useSectionForm } from "../use-section-form";
import type { SectionFormProps } from "./types";

type F = UseFormReturn<FieldValues>;

const PLATFORM_NAME: Record<(typeof SOCIAL_LINK_PLATFORMS)[number], string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
  YOUTUBE: "YouTube",
};

export function FooterForm({ initial, media, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "site.footer",
    initial,
    {
      blurb: "",
      image: null,
      socials: [],
      policyLinks: [],
    },
  );
  const socials = useFieldArray({ control: form.control, name: "socials" });
  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <TextField
        form={form as F}
        name="blurb"
        id="ft-blurb"
        label={t.blurb}
        maxLength={240}
        textarea
      />
      <ImageField
        control={form.control}
        name="image"
        id="ft-image"
        label={t.footerImage}
        media={media}
        error={errorAt(form as F, "image.alt")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">{t.socials}</legend>
        {socials.fields.map((field, i) => {
          const hrefError = errorAt(form as F, `socials.${i}.href`);
          return (
            <div
              key={field.id}
              className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
            >
              <NativeSelect
                aria-label={t.platform}
                {...form.register(`socials.${i}.platform`)}
              >
                {SOCIAL_LINK_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_NAME[p]}
                  </option>
                ))}
              </NativeSelect>
              <div className="flex flex-col gap-1">
                <Input
                  aria-label={t.href}
                  placeholder="https://"
                  className="h-11 font-mono"
                  aria-invalid={Boolean(hrefError)}
                  {...form.register(`socials.${i}.href`)}
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
                aria-label={t.removeLink.replace("{index}", String(i + 1))}
                onClick={() => socials.remove(i)}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        {socials.fields.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => socials.append({ platform: "FACEBOOK", href: "" })}
          >
            <Plus />
            {t.addSocial}
          </Button>
        )}
      </fieldset>
      <LinksField
        form={form as F}
        name="policyLinks"
        label={t.policyLinks}
        hint={t.hrefHint}
        max={6}
      />
    </SectionShell>
  );
}
