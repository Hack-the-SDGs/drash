"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  lockUserAction,
  unlockUserAction,
  deleteUserAction,
} from "@/lib/actions/users";
import { useDict } from "@/components/dict-provider";
import { toast } from "sonner";
import type { APIUser } from "@/lib/types";
import {
  MoreHorizontalIcon,
  PencilIcon,
  LockIcon,
  LockOpenIcon,
  Trash2Icon,
  PlusIcon,
} from "lucide-react";

interface UserTableProps {
  users: APIUser[];
  lang: string;
}

export function UserTable({ users, lang }: UserTableProps) {
  const dict = useDict();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<APIUser | null>(null);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  function handleLockToggle(user: APIUser) {
    startTransition(async () => {
      const action = user.isLocked ? unlockUserAction : lockUserAction;
      const result = await action(user.uuid);
      if (result.success) {
        toast.success(
          user.isLocked ? dict.users.unlocked : dict.users.locked,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const uuid = deleteTarget.uuid;
    startTransition(async () => {
      const result = await deleteUserAction(uuid);
      if (result.success) {
        toast.success(dict.users.deleted);
      } else {
        toast.error(result.error);
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={dict.common.search + "..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/${lang}/admin/users/new`} />}
        >
          <PlusIcon className="size-4" data-icon="inline-start" />
          {dict.users.createUser}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.users.username}</TableHead>
              <TableHead>{dict.users.isAdmin}</TableHead>
              <TableHead>{dict.users.isLocked}</TableHead>
              <TableHead>{dict.users.players}</TableHead>
              <TableHead className="w-[60px]">{dict.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {dict.common.noData}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.uuid}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Badge variant="default">{dict.users.isAdmin}</Badge>
                    ) : (
                      <Badge variant="secondary">{dict.common.no}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isLocked ? (
                      <Badge variant="destructive">{dict.users.isLocked}</Badge>
                    ) : (
                      <Badge variant="secondary">{dict.common.no}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.players?.length ?? 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" />
                        }
                      >
                        <MoreHorizontalIcon className="size-4" />
                        <span className="sr-only">{dict.common.actions}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link href={`/${lang}/admin/users/${user.uuid}`} />
                          }
                        >
                          <PencilIcon className="size-4" />
                          {dict.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleLockToggle(user)}
                          disabled={isPending}
                        >
                          {user.isLocked ? (
                            <>
                              <LockOpenIcon className="size-4" />
                              {dict.users.unlock}
                            </>
                          ) : (
                            <>
                              <LockIcon className="size-4" />
                              {dict.users.lock}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2Icon className="size-4" />
                          {dict.users.deleteUser}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={dict.users.deleteUser}
        description={dict.users.deleteUserConfirm}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        destructive
        onConfirm={handleDelete}
        pending={isPending}
      />
    </div>
  );
}
