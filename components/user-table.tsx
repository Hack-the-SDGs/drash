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
  ShieldCheckIcon,
} from "lucide-react";

interface UserTableProps {
  users: APIUser[];
  lang: string;
  currentUserUuid: string;
}

export function UserTable({ users, lang, currentUserUuid }: UserTableProps) {
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
        <div className="flex items-center gap-3">
          <Input
            placeholder={dict.common.search + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary" className="whitespace-nowrap">
            {dict.common.total.replace("{count}", String(filtered.length))}
          </Badge>
        </div>
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
              filtered.map((user) => {
                const isSelf = user.uuid === currentUserUuid;
                const playerNames = user.players?.map((p) => p.name) ?? [];

                return (
                  <TableRow
                    key={user.uuid}
                    className={isSelf ? "bg-primary/5" : undefined}
                  >
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${lang}/admin/users/${user.uuid}`}
                            className="font-medium hover:underline"
                          >
                            {user.username}
                          </Link>
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">
                              {dict.users.selfIndicator}
                            </span>
                          )}
                        </div>
                        {playerNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {playerNames.join(", ")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-600">
                          <ShieldCheckIcon className="size-3" />
                          {dict.users.isAdmin}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{dict.common.no}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isLocked ? (
                        <Badge variant="destructive">
                          <LockIcon className="size-3" />
                          {dict.users.isLocked}
                        </Badge>
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
                            disabled={isPending || isSelf}
                            title={isSelf ? dict.users.cannotLockSelf : undefined}
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
                            {isSelf && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {dict.users.cannotLockSelf}
                              </span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(user)}
                            disabled={isSelf}
                            title={isSelf ? dict.users.cannotDeleteSelf : undefined}
                          >
                            <Trash2Icon className="size-4" />
                            {dict.users.deleteUser}
                            {isSelf && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {dict.users.cannotDeleteSelf}
                              </span>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
