"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockedPhone } from "@/lib/customer/customer-schemas";
import {
  useBlockedPhones,
  useUnblockPhone,
} from "@/lib/customer/use-customers";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { BlockDialog } from "../../customers/_components/block-dialog";
import { formatDate } from "../../orders/_components/format";

/** The COD blocklist (PRD §5.8, §6.5). OWNER and STAFF. */
export function BlockedPhonesScreen() {
  const t = getAdminMessages();
  const tc = t.customers;
  const [search, setSearch] = React.useState("");
  const [q, setQ] = React.useState("");
  const list = useBlockedPhones(q);
  const unblock = useUnblockPhone();
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState<BlockedPhone | null>(null);

  return (
    <>
      <PageHeader
        title={t.nav.blocklist}
        description={tc.blocklistIntro}
        actions={
          <Button size="lg" onClick={() => setAdding(true)}>
            <Plus />
            {tc.addBlock}
          </Button>
        }
      />
      <search className="relative mb-4 sm:w-64">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            inputMode="tel"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc.phone}
            aria-label={tc.phone}
            className="h-11 pl-8"
          />
        </form>
      </search>
      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ListError error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {list.data.data.map((b) => (
            <li
              key={b.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/customers/${b.phone}`}
                  className="font-mono hover:text-primary"
                >
                  {b.phone}
                </Link>
                <p className="text-sm">{b.reason}</p>
                <p className="text-muted-foreground text-xs">
                  {tc.blockedOn} {formatDate(b.createdAt)}
                  {b.createdBy && ` · ${tc.by} ${b.createdBy}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={format(tc.unblockConfirm, { phone: b.phone })}
                onClick={() => setRemoving(b)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <BlockDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDeleteDialog
        name={removing?.phone ?? null}
        title={format(tc.unblockConfirm, { phone: removing?.phone ?? "" })}
        description={tc.blockHint}
        confirmLabel={tc.unblock}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing) await unblock.mutateAsync(removing.id);
          setRemoving(null);
        }}
      />
    </>
  );
}
