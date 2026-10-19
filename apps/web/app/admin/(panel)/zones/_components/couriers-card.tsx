"use client";

import { courierSettingsSchema } from "@aaarchive/shared/settings";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText, fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useCouriers, useSaveCouriers } from "@/lib/settings/use-couriers";

type Row = { key: number; name: string; trackingUrl: string };

/**
 * The courier services the store uses (PRD §6.4), with optional tracking
 * link patterns for the customer's tracking page (PRD §5.9). Owner edits;
 * staff see the list.
 */
export function CouriersCard() {
  const t = getAdminMessages();
  const tc = t.couriers;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const couriers = useCouriers();
  const save = useSaveCouriers();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const nextKey = React.useRef(0);

  React.useEffect(() => {
    if (!couriers.data) return;
    setRows(
      couriers.data.couriers.map((c) => ({ key: nextKey.current++, ...c })),
    );
  }, [couriers.data]);

  const update = (key: number, field: "name" | "trackingUrl", value: string) =>
    setRows((rs) =>
      rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const body = {
      couriers: rows
        .filter((r) => r.name.trim() || r.trackingUrl.trim())
        .map(({ name, trackingUrl }) => ({ name, trackingUrl })),
    };
    const parsed = courierSettingsSchema.safeParse(body);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(parsed.data);
      setMessage(tc.saved);
    } catch (error) {
      setMessage(errorText(error));
    }
  };

  return (
    <section className="mt-10 flex max-w-3xl flex-col gap-3">
      <div>
        <h2 className="font-semibold text-lg">{tc.title}</h2>
        <p className="text-muted-foreground text-sm">{tc.intro}</p>
      </div>
      {couriers.isPending ? (
        <ListSkeleton rows={2} />
      ) : couriers.isError ? (
        <ListError error={couriers.error} onRetry={() => couriers.refetch()} />
      ) : !canEdit ? (
        rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{tc.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {rows.map((r) => (
              <li
                key={r.key}
                className="flex flex-wrap gap-2 rounded-md border p-2"
              >
                <span className="font-medium">{r.name}</span>
                <span className="break-all font-mono text-muted-foreground text-xs">
                  {r.trackingUrl || tc.noLink}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          {rows.length === 0 && (
            <p className="text-muted-foreground text-sm">{tc.empty}</p>
          )}
          <ul className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const nameError = errors[`couriers.${i}.name`];
              const urlError = errors[`couriers.${i}.trackingUrl`];
              return (
                <li
                  key={r.key}
                  className="grid gap-2 rounded-md border p-2 sm:grid-cols-[12rem_1fr_auto]"
                >
                  <div className="flex flex-col gap-1">
                    <Input
                      aria-label={tc.name}
                      placeholder={tc.name}
                      maxLength={40}
                      value={r.name}
                      aria-invalid={Boolean(nameError)}
                      onChange={(e) => update(r.key, "name", e.target.value)}
                      className="h-11"
                    />
                    {nameError && (
                      <span className="text-destructive text-xs">
                        {fieldErrorText(nameError)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      aria-label={tc.trackingUrl}
                      placeholder="https://…/{tracking}"
                      maxLength={300}
                      value={r.trackingUrl}
                      aria-invalid={Boolean(urlError)}
                      onChange={(e) =>
                        update(r.key, "trackingUrl", e.target.value)
                      }
                      className="h-11 font-mono"
                    />
                    {urlError && (
                      <span className="text-destructive text-xs">
                        {fieldErrorText(urlError)}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="justify-self-end"
                    aria-label={format(tc.remove, { name: r.name || tc.name })}
                    onClick={() =>
                      setRows((rs) => rs.filter((x) => x.key !== r.key))
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
          {errors.couriers && (
            <p className="text-destructive text-sm">
              {fieldErrorText(errors.couriers)}
            </p>
          )}
          <p className="text-muted-foreground text-xs">{tc.trackingUrlHint}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={rows.length >= 20}
              onClick={() =>
                setRows((rs) => [
                  ...rs,
                  { key: nextKey.current++, name: "", trackingUrl: "" },
                ])
              }
            >
              <Plus />
              {tc.add}
            </Button>
            <Button type="submit" size="lg" disabled={save.isPending}>
              {save.isPending ? t.saving : tc.save}
            </Button>
            {message && (
              <span role="status" className="text-sm">
                {message}
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
