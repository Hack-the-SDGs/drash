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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  batchLockUsersAction,
  batchUnlockUsersAction,
  batchDeleteUsersAction,
  batchSetMaxPlayerCountAction,
  batchResetApiTokenAction,
  batchResetMinecraftTokenAction,
} from "@/lib/actions/users";
import { useDict } from "@/components/dict-provider";
import { toast } from "sonner";
import type { APIUser, Role } from "@/lib/types";
import {
  MoreHorizontalIcon,
  PencilIcon,
  LockIcon,
  LockOpenIcon,
  Trash2Icon,
  PlusIcon,
  ShieldCheckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
  UsersIcon,
  KeyIcon,
  SwordIcon,
} from "lucide-react";
import { useSortable } from "@/hooks/use-sortable";
import { useSelection } from "@/hooks/use-selection";
import { canLockUser } from "@/lib/permissions";

interface UserTableProps {
  users: APIUser[];
  lang: string;
  currentUserUuid: string;
  viewerRole: Role;
  userRoles: Record<string, Role>;
}

export function UserTable({ users, lang, currentUserUuid, viewerRole, userRoles }: UserTableProps) {
  const dict = useDict();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<APIUser | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchResetApiOpen, setBatchResetApiOpen] = useState(false);
  const [batchResetMcOpen, setBatchResetMcOpen] = useState(false);
  const [maxPlayersOpen, setMaxPlayersOpen] = useState(false);
  const [maxPlayersValue, setMaxPlayersValue] = useState("1");

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const { sorted, sortKey, direction, toggleSort } = useSortable(filtered, {
    defaultKey: "adminFirst",
    defaultDirection: "asc",
    sortFns: {
      adminFirst: (a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        return a.username.localeCompare(b.username);
      },
      username: (a, b) => a.username.localeCompare(b.username),
      locked: (a, b) => {
        if (a.isLocked !== b.isLocked) return a.isLocked ? -1 : 1;
        return a.username.localeCompare(b.username);
      },
      playerCount: (a, b) => (a.players?.length ?? 0) - (b.players?.length ?? 0),
    },
  });

  // Only selectable: users the viewer can manage
  const selectableIds = sorted
    .filter((u) => canLockUser(viewerRole, userRoles[u.uuid] ?? "user", u.uuid === currentUserUuid))
    .map((u) => u.uuid);

  const { selected, handleClick, clearSelection } = useSelection(selectableIds);

  function handleLockToggle(user: APIUser) {
    startTransition(async () => {
      const action = user.isLocked ? unlockUserAction : lockUserAction;
      const result = await action(user.uuid);
      if (result.success) {
        toast.success(user.isLocked ? dict.users.unlocked : dict.users.locked);
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
      if (result.success) toast.success(dict.users.deleted);
      else toast.error(result.error);
      setDeleteTarget(null);
    });
  }

  function showBatchResult(template: string, results: { success: boolean }[]) {
    const success = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    toast.success(template.replace("{success}", String(success)).replace("{failed}", String(failed)));
    clearSelection();
  }

  function handleBatchLock() {
    const uuids = [...selected];
    startTransition(async () => {
      const results = await batchLockUsersAction(uuids);
      showBatchResult(dict.users.batchLocked, results);
    });
  }

  function handleBatchUnlock() {
    const uuids = [...selected];
    startTransition(async () => {
      const results = await batchUnlockUsersAction(uuids);
      showBatchResult(dict.users.batchUnlocked, results);
    });
  }

  function handleBatchDelete() {
    const uuids = [...selected];
    startTransition(async () => {
      const results = await batchDeleteUsersAction(uuids);
      showBatchResult(dict.users.batchDeleted, results);
      setBatchDeleteOpen(false);
    });
  }

  function handleBatchSetMaxPlayers() {
    const uuids = [...selected];
    const count = parseInt(maxPlayersValue, 10);
    if (isNaN(count) || count < 0) return;
    startTransition(async () => {
      const results = await batchSetMaxPlayerCountAction(uuids, count);
      showBatchResult(dict.users.batchMaxPlayersSet, results);
      setMaxPlayersOpen(false);
    });
  }

  function handleBatchResetApiToken() {
    const uuids = [...selected];
    startTransition(async () => {
      const results = await batchResetApiTokenAction(uuids);
      showBatchResult(dict.users.batchApiTokenReset, results);
      setBatchResetApiOpen(false);
    });
  }

  function handleBatchResetMcToken() {
    const uuids = [...selected];
    startTransition(async () => {
      const results = await batchResetMinecraftTokenAction(uuids);
      showBatchResult(dict.users.batchMinecraftTokenReset, results);
      setBatchResetMcOpen(false);
    });
  }

  return (
    <div className={`space-y-4${selected.size > 0 ? " select-none" : ""}`}>
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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/${lang}/admin/users/batch`} />}>
            <PlusIcon className="size-4" data-icon="inline-start" />
            {dict.users.batchCreate}
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/${lang}/admin/users/new`} />}
          >
            <PlusIcon className="size-4" data-icon="inline-start" />
            {dict.users.createUser}
          </Button>
        </div>
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
                  {dict.users.isAdmin}
                  {sortKey === "adminFirst" && (direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("locked")}>
                  {dict.users.isLocked}
                  {sortKey === "locked" && (direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("playerCount")}>
                  {dict.users.players}
                  {sortKey === "playerCount" && (direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                </button>
              </TableHead>
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
              sorted.map((user) => {
                const isSelf = user.uuid === currentUserUuid;
                const playerNames = user.players?.map((p) => p.name) ?? [];
                const targetRole = userRoles[user.uuid] ?? "user";
                const canLock = canLockUser(viewerRole, targetRole, isSelf);
                const canEdit = isSelf || canLock;
                const isSelected = selected.has(user.uuid);
                const roleColor = targetRole === "root" ? "text-red-500" : targetRole === "admin" ? "text-amber-500" : undefined;

                return (
                  <TableRow
                    key={user.uuid}
                    className={
                      isSelected
                        ? "bg-primary/10"
                        : isSelf
                          ? "bg-primary/5"
                          : undefined
                    }
                    onClick={(e) => {
                      if (canLock) handleClick(user.uuid, e);
                    }}
                  >
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {canEdit ? (
                            <Link
                              href={`/${lang}/admin/users/${user.uuid}`}
                              className={`font-medium hover:underline${roleColor ? ` ${roleColor}` : ""}`}
                              onClick={(e) => {
                                if (e.metaKey || e.ctrlKey || e.shiftKey) e.preventDefault();
                              }}
                            >
                              {user.username}
                            </Link>
                          ) : (
                            <span className={`font-medium${roleColor ? ` ${roleColor}` : ""}`}>
                              {user.username}
                            </span>
                          )}
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
                          render={<Button variant="ghost" size="icon-sm" />}
                        >
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">{dict.common.actions}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={<Link href={`/${lang}/admin/users/${user.uuid}`} />}
                            disabled={!canLock && !isSelf}
                          >
                            <PencilIcon className="size-4" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleLockToggle(user)}
                            disabled={isPending || !canLock}
                            title={!canLock ? (isSelf ? dict.users.cannotLockSelf : dict.users.cannotLockHigherRole) : undefined}
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
                            disabled={!canLock}
                            title={!canLock ? (isSelf ? dict.users.cannotDeleteSelf : dict.users.cannotLockHigherRole) : undefined}
                          >
                            <Trash2Icon className="size-4" />
                            {dict.users.deleteUser}
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

      {/* Fixed bottom batch action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-popover px-4 py-2.5 shadow-lg ring-1 ring-foreground/10">
            <Button variant="ghost" size="icon-xs" onClick={clearSelection}>
              <XIcon className="size-3.5" />
            </Button>
            <span className="text-sm font-medium">
              {dict.users.selected.replace("{count}", String(selected.size))}
            </span>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button size="xs" variant="outline" onClick={handleBatchLock} disabled={isPending}>
              <LockIcon className="size-3" data-icon="inline-start" />
              {dict.users.batchLock}
            </Button>
            <Button size="xs" variant="outline" onClick={handleBatchUnlock} disabled={isPending}>
              <LockOpenIcon className="size-3" data-icon="inline-start" />
              {dict.users.batchUnlock}
            </Button>
            <Button size="xs" variant="outline" onClick={() => setMaxPlayersOpen(true)} disabled={isPending}>
              <UsersIcon className="size-3" data-icon="inline-start" />
              {dict.users.batchSetMaxPlayers}
            </Button>
            <Button size="xs" variant="outline" onClick={() => setBatchResetApiOpen(true)} disabled={isPending}>
              <KeyIcon className="size-3" data-icon="inline-start" />
              {dict.users.batchResetApiToken}
            </Button>
            <Button size="xs" variant="outline" onClick={() => setBatchResetMcOpen(true)} disabled={isPending}>
              <SwordIcon className="size-3" data-icon="inline-start" />
              {dict.users.batchResetMinecraftToken}
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button size="xs" variant="destructive" onClick={() => setBatchDeleteOpen(true)} disabled={isPending}>
              <Trash2Icon className="size-3" data-icon="inline-start" />
              {dict.users.batchDelete}
            </Button>
          </div>
        </div>
      )}

      {/* Single delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={dict.users.deleteUser}
        description={dict.users.deleteUserConfirm}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        destructive
        onConfirm={handleDelete}
        pending={isPending}
      />

      {/* Batch delete confirm */}
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={dict.users.batchDelete}
        description={dict.users.batchDeleteConfirm.replace("{count}", String(selected.size))}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        destructive
        onConfirm={handleBatchDelete}
        pending={isPending}
      />

      {/* Batch reset API token confirm */}
      <ConfirmDialog
        open={batchResetApiOpen}
        onOpenChange={setBatchResetApiOpen}
        title={dict.users.batchResetApiToken}
        description={dict.users.batchResetApiTokenConfirm.replace("{count}", String(selected.size))}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={handleBatchResetApiToken}
        pending={isPending}
      />

      {/* Batch reset MC token confirm */}
      <ConfirmDialog
        open={batchResetMcOpen}
        onOpenChange={setBatchResetMcOpen}
        title={dict.users.batchResetMinecraftToken}
        description={dict.users.batchResetMinecraftTokenConfirm.replace("{count}", String(selected.size))}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={handleBatchResetMcToken}
        pending={isPending}
      />

      {/* Batch set max players dialog */}
      <Dialog open={maxPlayersOpen} onOpenChange={setMaxPlayersOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{dict.users.batchSetMaxPlayers}</DialogTitle>
            <DialogDescription>
              {dict.users.batchSetMaxPlayersPrompt.replace("{count}", String(selected.size))}
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={0}
            value={maxPlayersValue}
            onChange={(e) => setMaxPlayersValue(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaxPlayersOpen(false)} disabled={isPending}>
              {dict.common.cancel}
            </Button>
            <Button onClick={handleBatchSetMaxPlayers} disabled={isPending}>
              {isPending ? "..." : dict.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
