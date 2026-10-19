"use client";

import type { ContentKey } from "@aaarchive/shared/content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { useContentBlocks } from "@/lib/content/use-content";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { formatDate } from "../../orders/_components/format";

const HOME: ContentKey[] = [
  "home.hero",
  "home.categories",
  "home.lookFile",
  "home.latest",
  "home.promises",
  "home.social",
];
const SITE: ContentKey[] = [
  "site.announcement",
  "site.navigation",
  "site.footer",
];

function Row({
  href,
  title,
  description,
  status,
}: {
  href: string;
  title: string;
  description: string;
  status?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-16 items-center justify-between gap-3 rounded-md border p-3 hover:border-line-strong"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {title}
            {status}
          </span>
          <span className="block text-muted-foreground text-sm">
            {description}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** Content overview (PRD §6.7): home sections, site blocks, lists. */
export function ContentScreen() {
  const t = getAdminMessages();
  const tc = t.content;
  const blocks = useContentBlocks();

  const section = (key: ContentKey) => {
    const block = blocks.data?.blocks.find((b) => b.key === key);
    const [title, description] = tc.sections[key];
    return (
      <Row
        key={key}
        href={`/admin/content/${key}`}
        title={title}
        description={
          block?.updatedAt
            ? `${description} ${format(tc.updated, { date: formatDate(block.updatedAt), name: block.updatedBy ?? "—" })}`
            : description
        }
        status={
          block?.data ? (
            <Badge variant="outline" className="border-success text-success">
              {tc.live}
            </Badge>
          ) : (
            <Badge variant="outline">{tc.notSetUp}</Badge>
          )
        }
      />
    );
  };

  return (
    <>
      <PageHeader title={t.nav.content} description={tc.screenIntro} />
      {blocks.isPending ? (
        <ListSkeleton rows={8} />
      ) : blocks.isError ? (
        <ListError error={blocks.error} onRetry={() => blocks.refetch()} />
      ) : (
        <div className="flex max-w-3xl flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{tc.homeTitle}</h2>
            <ul className="flex flex-col gap-2">{HOME.map(section)}</ul>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{tc.siteTitle}</h2>
            <ul className="flex flex-col gap-2">{SITE.map(section)}</ul>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">{tc.tablesTitle}</h2>
            <ul className="flex flex-col gap-2">
              <Row
                href="/admin/content/social-posts"
                title={tc.socialPosts[0]}
                description={tc.socialPosts[1]}
              />
              <Row
                href="/admin/content/pages"
                title={tc.pages[0]}
                description={tc.pages[1]}
              />
              <Row
                href="/admin/content/faq"
                title={tc.faq[0]}
                description={tc.faq[1]}
              />
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
