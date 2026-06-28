"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteCascadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Label for the "also delete generated users" checkbox (checked by default). */
  cascadeLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  onConfirm: (deleteUsers: boolean) => void;
}

/**
 * Destructive confirm dialog with an optional "also delete generated
 * users/players" checkbox (default checked). Shared by groups and topics.
 */
export function DeleteCascadeDialog({
  open,
  onOpenChange,
  title,
  description,
  cascadeLabel,
  confirmLabel,
  cancelLabel,
  pending = false,
  onConfirm,
}: DeleteCascadeDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [deleteUsers, setDeleteUsers] = useState(true);

  // Reset the checkbox to checked every time the dialog opens.
  useEffect(() => {
    if (open) setDeleteUsers(true);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={deleteUsers}
            onChange={(e) => setDeleteUsers(e.target.checked)}
            className="size-4 accent-destructive"
          />
          {cascadeLabel}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant="destructive"
            onClick={() => onConfirm(deleteUsers)}
            disabled={pending}
          >
            {pending ? "..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
