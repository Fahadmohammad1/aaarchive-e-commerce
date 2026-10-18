"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/i18n/error-text";
import { format, getMessages } from "@/lib/i18n/i18n";

type ConfirmDeleteDialogProps = {
  /** The item to delete; null closes the dialog. */
  name: string | null;
  onCancel: () => void;
  /** Rejects with the API error, which is shown in the dialog. */
  onConfirm: () => Promise<unknown>;
};

export function ConfirmDeleteDialog({
  name,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const t = getMessages().admin.common;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (name) setError(null);
  }, [name]);

  return (
    <AlertDialog
      open={name !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {format(t.deleteConfirm, { name: name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.deleteCannotUndo}</AlertDialogDescription>
        </AlertDialogHeader>
        {error !== null && (
          <p role="alert" className="text-destructive text-sm">
            {errorText(error)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.cancel}</AlertDialogCancel>
          {/* A plain button: AlertDialogAction would close before the request finishes. */}
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await onConfirm();
                onCancel();
              } catch (e) {
                setError(e);
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? t.deleting : t.delete}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
