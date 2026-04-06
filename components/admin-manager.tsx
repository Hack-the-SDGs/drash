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
import { ShieldCheckIcon, ShieldOffIcon } from "lucide-react";
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
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.admins.title}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.users.username}</TableHead>
            <TableHead>{dict.profile.role}</TableHead>
            <TableHead>{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.uuid === currentUserUuid;

            return (
              <TableRow key={user.uuid}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  {user.isAdmin ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">User</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.isAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSelf || isPending}
                      title={isSelf ? dict.admins.cannotDemoteSelf : undefined}
                      onClick={() =>
                        setPendingAction({ user, promote: false })
                      }
                    >
                      <ShieldOffIcon className="size-4" />
                      {dict.admins.demote}
                    </Button>
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
