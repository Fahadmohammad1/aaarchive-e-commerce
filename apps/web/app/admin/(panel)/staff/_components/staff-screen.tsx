"use client";

import { staffCreateSchema } from "@aaarchive/shared/auth";
import { Pencil, Plus } from "lucide-react";
import * as React from "react";
import { FormField } from "@/components/admin/form-field";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { NativeSelect } from "@/components/admin/native-select";
import { PageHeader } from "@/components/admin/page-header";
import { SwitchField } from "@/components/admin/switch-field";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { ApiError } from "@/lib/api/api-error";
import { errorText, fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { StaffMember } from "@/lib/staff/staff-schemas";
import {
  useCreateStaff,
  useStaff,
  useUpdateStaff,
} from "@/lib/staff/use-staff";
import { formatDate } from "../../orders/_components/format";

/** Staff management (PRD §6.8). Owner only. */
export function StaffScreen() {
  const t = getAdminMessages();
  const ts = t.staffPage;
  const { user } = useAuth();
  const staff = useStaff();
  const [editing, setEditing] = React.useState<StaffMember | null>(null);
  const [open, setOpen] = React.useState(false);
  if (user?.role !== "OWNER")
    return <p className="text-muted-foreground">{t.errors.FORBIDDEN}</p>;

  return (
    <>
      <PageHeader
        title={t.nav.staff}
        description={ts.intro}
        actions={
          <Button
            size="lg"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus />
            {ts.add}
          </Button>
        }
      />
      {staff.isPending ? (
        <ListSkeleton />
      ) : staff.isError ? (
        <ListError error={staff.error} onRetry={() => staff.refetch()} />
      ) : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {staff.data.data.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {m.name}
                  <Badge variant="outline">{t.roles[m.role]}</Badge>
                  {m.id === user.id && (
                    <Badge variant="outline">{ts.you}</Badge>
                  )}
                  {!m.isActive && (
                    <Badge variant="stock-out">{ts.inactive}</Badge>
                  )}
                </p>
                <p className="truncate text-muted-foreground text-sm">
                  {m.email}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.lastLoginAt
                    ? format(ts.lastLogin, { date: formatDate(m.lastLoginAt) })
                    : ts.never}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`${t.common.edit} ${m.name}`}
                onClick={() => {
                  setEditing(m);
                  setOpen(true);
                }}
              >
                <Pencil />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <StaffDialog
        open={open}
        onOpenChange={setOpen}
        member={editing}
        self={editing?.id === user.id}
      />
    </>
  );
}

function StaffDialog({
  open,
  onOpenChange,
  member,
  self,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member: StaffMember | null;
  self: boolean;
}) {
  const returnFocus = useReturnFocus();
  const t = getAdminMessages();
  const ts = t.staffPage;
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    role: "STAFF" as "OWNER" | "STAFF",
    password: "",
    isActive: true,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    setValues(
      member
        ? {
            name: member.name,
            email: member.email ?? "",
            role: member.role,
            password: "",
            isActive: member.isActive,
          }
        : { name: "", email: "", role: "STAFF", password: "", isActive: true },
    );
  }, [open, member]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      if (member) {
        const body: Record<string, unknown> = {};
        if (values.name !== member.name) body.name = values.name.trim();
        if (values.role !== member.role) body.role = values.role;
        if (values.isActive !== member.isActive)
          body.isActive = values.isActive;
        if (values.password) body.password = values.password;
        if (Object.keys(body).length === 0) return onOpenChange(false);
        await update.mutateAsync({ id: member.id, body });
      } else {
        const parsed = staffCreateSchema.safeParse(values);
        if (!parsed.success) {
          setErrors(
            Object.fromEntries(
              parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
            ),
          );
          return;
        }
        await create.mutateAsync(parsed.data);
      }
      onOpenChange(false);
    } catch (e) {
      const fieldErrors = ApiError.isApiError(e)
        ? ((e.details as { fieldErrors?: Record<string, string[]> } | undefined)
            ?.fieldErrors ?? null)
        : null;
      if (fieldErrors) {
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([k, v]) => [k, v[0] ?? "INVALID"]),
          ),
        );
      } else if (ApiError.isApiError(e) && e.code === "EMAIL_TAKEN") {
        setErrors({ email: "EMAIL_TAKEN" });
      } else {
        setFormError(errorText(e));
      }
    }
  };

  const pending = create.isPending || update.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...returnFocus} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {member ? format(ts.editTitle, { name: member.name }) : ts.newTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <FormField id="sf-name" label={ts.name} error={errors.name}>
            <Input
              id="sf-name"
              maxLength={60}
              className="h-11"
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </FormField>
          {!member && (
            <FormField id="sf-email" label={ts.email} error={errors.email}>
              <Input
                id="sf-email"
                type="email"
                autoComplete="off"
                className="h-11"
                value={values.email}
                onChange={(e) =>
                  setValues((v) => ({ ...v, email: e.target.value }))
                }
              />
            </FormField>
          )}
          <FormField id="sf-role" label={ts.role}>
            <NativeSelect
              id="sf-role"
              disabled={self}
              value={values.role}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  role: e.target.value as "OWNER" | "STAFF",
                }))
              }
            >
              <option value="STAFF">{t.roles.STAFF}</option>
              <option value="OWNER">{t.roles.OWNER}</option>
            </NativeSelect>
          </FormField>
          <FormField
            id="sf-password"
            label={member ? ts.newPassword : ts.password}
            hint={member ? ts.newPasswordHint : ts.passwordHint}
            error={errors.password}
          >
            <Input
              id="sf-password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              value={values.password}
              onChange={(e) =>
                setValues((v) => ({ ...v, password: e.target.value }))
              }
            />
          </FormField>
          {member && !self && (
            <SwitchField
              id="sf-active"
              label={ts.active}
              checked={values.isActive}
              onCheckedChange={(c) => setValues((v) => ({ ...v, isActive: c }))}
            />
          )}
          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}
          {Object.keys(errors).length > 0 &&
            !errors.name &&
            !errors.email &&
            !errors.password && (
              <p className="text-destructive text-sm">
                {fieldErrorText(Object.values(errors)[0])}
              </p>
            )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending
                ? t.saving
                : member
                  ? t.common.saveChanges
                  : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
