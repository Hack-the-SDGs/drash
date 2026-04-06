"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import {
  createInviteAction,
  deleteInviteAction,
} from "@/lib/actions/invites";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Trash2Icon, CopyIcon } from "lucide-react";
import type { APIInvite } from "@/lib/types";

interface InviteManagerProps {
  invites: APIInvite[];
}

export function InviteManager({ invites }: InviteManagerProps) {
  const dict = useDict();
  const [deleteTarget, setDeleteTarget] = useState<APIInvite | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const result = await createInviteAction();
      if (result.success) {
        toast.success(dict.invites.created);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  function handleDelete(invite: APIInvite) {
    startTransition(async () => {
      const result = await deleteInviteAction(invite.code);
      if (result.success) {
        toast.success(dict.invites.deleted);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      toast.success(dict.common.copiedToClipboard);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{dict.invites.title}</h1>
        <Button onClick={handleCreate} disabled={isPending}>
          <PlusIcon className="size-4" />
          {dict.invites.createInvite}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.invites.code}</TableHead>
            <TableHead>{dict.invites.createdAt}</TableHead>
            <TableHead>{dict.invites.link}</TableHead>
            <TableHead>{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {dict.common.noData}
              </TableCell>
            </TableRow>
          ) : (
            invites.map((invite) => (
              <TableRow key={invite.code}>
                <TableCell className="font-mono text-xs">
                  {invite.code}
                </TableCell>
                <TableCell>
                  {new Date(invite.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {invite.url}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleCopy(invite.url)}
                    >
                      <CopyIcon className="size-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(invite)}
                    disabled={isPending}
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={dict.invites.deleteInvite}
        description={dict.invites.deleteConfirm}
        confirmLabel={dict.common.delete}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        destructive
      />
    </div>
  );
}
