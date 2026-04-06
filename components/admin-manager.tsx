"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { setAdminAction } from "@/lib/actions/users";
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
import { ShieldCheckIcon, ShieldOffIcon, UserIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { useSortable } from "@/hooks/use-sortable";
import type { APIUser } from "@/lib/types";

interface AdminManagerProps {
  users: APIUser[];
  currentUserUuid: string;
}

interface PendingAction {
  user: APIUser;
  promote: boolean;
}

export function AdminManager({ users, currentUserUuid }: AdminManagerProps) {
  const dict = useDict();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const { sorted, sortKey, direction, toggleSort } = useSortable(users, {
    defaultKey: "adminFirst",
    defaultDirection: "asc",
    sortFns: {
      adminFirst: (a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        return a.username.localeCompare(b.username);
      },
      username: (a, b) => a.username.localeCompare(b.username),
    },
  });

  function handleConfirm() {
    if (!pendingAction) return;

    const { user, promote } = pendingAction;
    startTransition(async () => {
      const result = await setAdminAction(user.uuid, promote);
      if (result.success) {
        toast.success(promote ? dict.admins.promoted : dict.admins.demoted);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
      setPendingAction(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="whitespace-nowrap">
          {dict.common.total.replace("{count}", String(users.length))}
        </Badge>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("username")}>
                  {dict.users.username}
                  {sortKey === "username" && (direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("adminFirst")}>
                  {dict.profile.role}
                  {sortKey === "adminFirst" && (direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                </button>
              </TableHead>
              <TableHead>{dict.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => {
              const isSelf = user.uuid === currentUserUuid;

              return (
                <TableRow
                  key={user.uuid}
                  className={isSelf ? "bg-primary/5" : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      {isSelf && (
                        <span className="text-xs text-muted-foreground">
                          {dict.users.selfIndicator}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Badge variant="default" className="bg-blue-600 hover:bg-blue-600">
                        <ShieldCheckIcon className="size-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <UserIcon className="size-3" />
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf || isPending}
                          onClick={() =>
                            setPendingAction({ user, promote: false })
                          }
                        >
                          <ShieldOffIcon className="size-4" />
                          {dict.admins.demote}
                        </Button>
                        {isSelf && (
                          <span className="text-xs text-muted-foreground">
                            {dict.admins.cannotDemoteSelf}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          setPendingAction({ user, promote: true })
                        }
                      >
                        <ShieldCheckIcon className="size-4" />
                        {dict.admins.promote}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction?.promote
            ? dict.admins.promote
            : dict.admins.demote
        }
        description={
          pendingAction?.promote
            ? dict.admins.promoteConfirm
            : dict.admins.demoteConfirm
        }
        confirmLabel={dict.common.confirm}
        onConfirm={handleConfirm}
        destructive={!pendingAction?.promote}
      />
    </div>
  );
}
