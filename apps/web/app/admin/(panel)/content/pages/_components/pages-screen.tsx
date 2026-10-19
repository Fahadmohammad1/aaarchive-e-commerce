"use client";

import { pagePath } from "@aaarchive/shared/content";
import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { usePages } from "@/lib/content/use-content";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { formatDate } from "../../../orders/_components/format";

/** Content → Pages (PRD §5.11): about, contact, size guide, policies. */
export function PagesScreen() {
  const t = getAdminMessages();
  const tc = t.content;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const pages = usePages();
  return (
    <>
      <PageHeader
        title={tc.pages[0]}
        description={canEdit ? tc.pages[1] : t.common.readOnly}
        actions={
          canEdit && (
            <Button size="lg" asChild>
              <Link href="/admin/content/pages/new">
                <Plus />
                {tc.newPage}
              </Link>
            </Button>
          )
        }
      />
      {pages.isPending ? (
        <ListSkeleton />
      ) : pages.isError ? (
        <ListError error={pages.error} onRetry={() => pages.refetch()} />
      ) : pages.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {pages.data.data.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <Link
                href={`/admin/content/pages/${p.id}`}
                className="min-w-0 hover:text-primary"
              >
                <span className="block font-medium">{p.title}</span>
                <span className="block font-mono text-muted-foreground text-xs">
                  {pagePath(p.slug)} · {formatDate(p.updatedAt)}
                </span>
              </Link>
              <Button variant="ghost" size="icon-lg" asChild>
                <a
                  href={pagePath(p.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${tc.openPage}: ${p.title}`}
                >
                  <ExternalLink />
                </a>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
