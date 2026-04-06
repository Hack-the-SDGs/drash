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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Trash2Icon, CopyIcon, CheckIcon } from "lucide-react";
import type { APIInvite } from "@/lib/types";

interface InviteManagerProps {
  invites: APIInvite[];
}

function formatRelativeTime(
  dateStr: string,
  dict: ReturnType<typeof useDict>,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return dict.common.justNow;
  if (diffMinutes < 60)
    return dict.common.minutesAgo.replace("{count}", String(diffMinutes));
  if (diffHours < 24)
    return dict.common.hoursAgo.replace("{count}", String(diffHours));
  return dict.common.daysAgo.replace("{count}", String(diffDays));
}

export function InviteManager({ invites }: InviteManagerProps) {
  const dict = useDict();
  const [deleteTarget, setDeleteTarget] = useState<APIInvite | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  function handleCopy(code: string, url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      toast.success(dict.common.copiedToClipboard);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary" className="whitespace-nowrap">
          {dict.common.total.replace("{count}", String(invites.length))}
        </Badge>
        <Button size="sm" onClick={handleCreate} disabled={isPending}>
          <PlusIcon className="size-4" data-icon="inline-start" />
          {dict.invites.createInvite}
        </Button>
      </div>

      <div className="rounded-lg border">
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
              invites.map((invite) => {
                const isCopied = copiedCode === invite.code;

                return (
                  <TableRow key={invite.code}>
                    <TableCell className="font-mono text-xs">
                      {invite.code}
                    </TableCell>
                    <TableCell>
                      <span title={new Date(invite.createdAt).toLocaleString()}>
                        {formatRelativeTime(invite.createdAt, dict)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {invite.url}
                        </span>
                        <Button
                          variant={isCopied ? "default" : "ghost"}
                          size="icon-xs"
                          onClick={() => handleCopy(invite.code, invite.url)}
                          className={isCopied ? "bg-green-600 text-white hover:bg-green-600" : undefined}
                        >
                          {isCopied ? (
                            <CheckIcon className="size-3" />
                          ) : (
                            <CopyIcon className="size-3" />
                          )}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
