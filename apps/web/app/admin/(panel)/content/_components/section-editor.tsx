"use client";

import { CONTENT_KEYS, type ContentKey } from "@aaarchive/shared/content";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type * as React from "react";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useContentBlocks } from "@/lib/content/use-content";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { FooterForm } from "./forms/footer-form";
import { LatestForm } from "./forms/latest-form";
import { LookFileForm } from "./forms/look-file-form";
import { PromisesForm } from "./forms/promises-form";
import {
  AnnouncementForm,
  CategoriesForm,
  HeroForm,
  NavigationForm,
  SocialForm,
} from "./forms/simple-forms";
import type { SectionFormProps } from "./forms/types";

const FORMS: Record<ContentKey, (props: SectionFormProps) => React.ReactNode> =
  {
    "home.hero": HeroForm,
    "home.categories": CategoriesForm,
    "home.lookFile": LookFileForm,
    "home.latest": LatestForm,
    "home.promises": PromisesForm,
    "home.social": SocialForm,
    "site.announcement": AnnouncementForm,
    "site.navigation": NavigationForm,
    "site.footer": FooterForm,
  };

/** /admin/content/<key>: one form per section (PRD §6.7). */
export function SectionEditorRoute() {
  const { key } = useParams<{ key: string }>();
  const decoded = decodeURIComponent(key);
  const t = getAdminMessages();
  const { user } = useAuth();
  const blocks = useContentBlocks();

  if (!(CONTENT_KEYS as string[]).includes(decoded)) {
    return <p className="text-muted-foreground">{t.errors.NOT_FOUND}</p>;
  }
  const contentKey = decoded as ContentKey;
  const [title, description] = t.content.sections[contentKey];
  const Form = FORMS[contentKey];

  return (
    <>
      <Link
        href="/admin/content"
        className="mb-2 flex min-h-11 w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.content.back}
      </Link>
      <PageHeader title={title} description={description} />
      {blocks.isPending ? (
        <ListSkeleton rows={6} />
      ) : blocks.isError ? (
        <ListError error={blocks.error} onRetry={() => blocks.refetch()} />
      ) : (
        <Form
          // Mounted once the data is loaded; a save keeps the form (and its
          // "Saved" line) instead of remounting it.
          key={contentKey}
          initial={
            blocks.data.blocks.find((b) => b.key === contentKey)?.data ?? null
          }
          media={blocks.data.media}
          products={blocks.data.products}
          canEdit={user?.role === "OWNER"}
        />
      )}
    </>
  );
}
