"use client";

import Link from "next/link";
import {
  Controller,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { SwitchField } from "@/components/admin/switch-field";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import {
  errorAt,
  HeadingLinesField,
  ImageField,
  LinksField,
  TextField,
} from "../fields";
import { SectionShell } from "../section-shell";
import { useSectionForm } from "../use-section-form";
import type { SectionFormProps } from "./types";

type F = UseFormReturn<FieldValues>;

export function HeroForm({ initial, media, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "home.hero",
    initial,
    { headline: [""], audiences: [], mainImage: null, sideImages: [] },
    // Empty side-photo slots are not saved.
    (v) => ({
      ...v,
      sideImages: ((v.sideImages as unknown[]) ?? []).filter(Boolean),
    }),
  );
  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <HeadingLinesField form={form as F} name="headline" label={t.heading} />
      <LinksField
        form={form as F}
        name="audiences"
        label={t.audiences}
        hint={t.audiencesHint}
        max={4}
      />
      <ImageField
        control={form.control}
        name="mainImage"
        id="hero-main"
        label={t.mainImage}
        media={media}
        error={
          errorAt(form as F, "mainImage.alt") ?? errorAt(form as F, "mainImage")
        }
      />
      {[0, 1].map((i) => (
        <ImageField
          key={i}
          control={form.control}
          name={`sideImages.${i}`}
          id={`hero-side-${i}`}
          label={t.sideImage.replace("{index}", String(i + 1))}
          media={media}
          error={errorAt(form as F, `sideImages.${i}.alt`)}
        />
      ))}
    </SectionShell>
  );
}

export function CategoriesForm({ initial, canEdit }: SectionFormProps) {
  const t = getAdminMessages();
  const { form, submit, saving, message } = useSectionForm(
    "home.categories",
    initial,
    {
      heading: [""],
      intro: "",
    },
  );
  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <HeadingLinesField
        form={form as F}
        name="heading"
        label={t.content.heading}
      />
      <TextField
        form={form as F}
        name="intro"
        id="cat-intro"
        label={t.content.intro}
        maxLength={240}
        textarea
      />
      <p className="text-muted-foreground text-sm">
        {t.content.sections["home.categories"][1]}{" "}
        <Link href="/admin/categories" className="underline">
          {t.nav.categories}
        </Link>
      </p>
    </SectionShell>
  );
}

export function SocialForm({ initial, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "home.social",
    initial,
    {
      heading: [""],
      intro: "",
      followHref: "",
    },
  );
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
        id="soc-intro"
        label={t.intro}
        maxLength={240}
        textarea
      />
      <TextField
        form={form as F}
        name="followHref"
        id="soc-follow"
        label={t.followHref}
        hint={t.hrefHint}
        maxLength={300}
        mono
      />
      <Link
        href="/admin/content/social-posts"
        className="w-fit text-sm underline"
      >
        {t.managePosts}
      </Link>
    </SectionShell>
  );
}

export function AnnouncementForm({ initial, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "site.announcement",
    initial,
    {
      enabled: false,
      text: "",
    },
  );
  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <Controller
        control={form.control}
        name="enabled"
        render={({ field }) => (
          <SwitchField
            id="ann-enabled"
            label={t.enabled}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <TextField
        form={form as F}
        name="text"
        id="ann-text"
        label={t.text}
        maxLength={120}
      />
    </SectionShell>
  );
}

export function NavigationForm({ initial, canEdit }: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "site.navigation",
    initial,
    {
      menu: [{ label: "", href: "" }],
      footer: [],
    },
  );
  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <LinksField
        form={form as F}
        name="menu"
        label={t.menuLinks}
        hint={t.hrefHint}
        max={10}
      />
      <LinksField
        form={form as F}
        name="footer"
        label={t.footerLinks}
        max={10}
      />
    </SectionShell>
  );
}
