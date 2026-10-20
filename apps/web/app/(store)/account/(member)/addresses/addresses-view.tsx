"use client";

import type { SavedAddress } from "@aaarchive/shared/account";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  useAddresses,
  useDeleteAddress,
  useSaveAddress,
} from "@/lib/account/use-account";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { Notice } from "../../_components/auth-card";

const AddressDialog = dynamic(
  () => import("./address-dialog").then((m) => m.AddressDialog),
  { ssr: false },
);

/** Saved addresses (PRD §5.10): fill checkout, one default. */
export function AddressesView() {
  const t = getMessages();
  const ta = t.account;
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  const save = useSaveAddress();
  const [editing, setEditing] = React.useState<SavedAddress | "new" | null>(
    null,
  );
  const [confirming, setConfirming] = React.useState<string | null>(null);

  return (
    <section aria-labelledby="addresses-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="addresses-title" className="type-display-sm">
            {ta.addresses}
          </h2>
          <p className="text-muted-foreground type-mono-micro">
            {ta.addressesIntro}
          </p>
        </div>
        <Button
          onClick={() => setEditing("new")}
          className="h-11 rounded-none px-4 type-mono-label uppercase"
        >
          <Plus aria-hidden strokeWidth={1.5} />
          {ta.addAddress}
        </Button>
      </div>

      {(remove.isError || save.isError) && (
        <Notice tone="error">
          {storeErrorText(remove.error ?? save.error)}
        </Notice>
      )}

      {addresses.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-40" />
          ))}
        </div>
      ) : addresses.isError ? (
        <div className="flex flex-col items-start gap-4">
          <Notice tone="error">{ta.loadFailed}</Notice>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => void addresses.refetch()}
          >
            {t.actions.retry}
          </Button>
        </div>
      ) : addresses.data.length === 0 ? (
        <p className="border border-dashed p-8 text-center text-muted-foreground type-mono-label">
          {ta.noAddresses}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.data.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="type-display-sm">{a.name}</span>
                {a.isDefault && (
                  <span className="bg-primary px-2 py-0.5 text-primary-foreground uppercase type-mono-micro">
                    {ta.default}
                  </span>
                )}
              </div>
              <address className="flex flex-col gap-1 text-muted-foreground not-italic type-mono-micro">
                <span className="font-mono text-foreground">{a.phone}</span>
                <span>{a.address}</span>
                <span>
                  {a.area}, {a.district} · {a.zone.name}
                </span>
              </address>
              <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="min-h-11 underline underline-offset-4 type-mono-label hover:text-primary"
                >
                  {ta.edit}
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() =>
                      save.mutate({
                        id: a.id,
                        input: {
                          name: a.name,
                          phone: a.phone,
                          zoneId: a.zone.id,
                          district: a.district,
                          area: a.area,
                          address: a.address,
                          isDefault: true,
                        },
                      })
                    }
                    className="min-h-11 underline underline-offset-4 type-mono-label hover:text-primary"
                  >
                    {ta.makeDefault}
                  </button>
                )}
                {confirming === a.id ? (
                  <span className="flex items-center gap-4">
                    <span className="type-mono-label">{ta.confirmDelete}</span>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(a.id, {
                          onSettled: () => setConfirming(null),
                        })
                      }
                      className="min-h-11 text-destructive underline underline-offset-4 type-mono-label"
                    >
                      {ta.delete}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="min-h-11 underline underline-offset-4 type-mono-label"
                    >
                      {ta.cancel}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(a.id)}
                    className="min-h-11 text-muted-foreground underline underline-offset-4 type-mono-label hover:text-destructive"
                  >
                    {ta.delete}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AddressDialog
          address={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
