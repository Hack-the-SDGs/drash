"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlusIcon, Trash2Icon, UsersIcon, HashIcon } from "lucide-react";
import {
  createGroupAction,
  deleteGroupAction,
  renumberGroupAction,
  updateMembersAction,
  type GroupActionResult,
} from "@/lib/actions/groups";
import type { Group } from "@/lib/groups/types";

export interface GroupStat {
  number: string;
  presentUsers: string[];
}

interface GroupManagerProps {
  groups: Group[];
  stats: GroupStat[];
}

/** Split a free-form member input into trimmed numbers. */
function parseMembers(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Keep only digits — used to block non-numeric input in number fields. */
function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function GroupManager({ groups, stats }: GroupManagerProps) {
  const dict = useDict();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [renumberTarget, setRenumberTarget] = useState<Group | null>(null);
  const [membersTarget, setMembersTarget] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  const statByNumber = new Map(stats.map((s) => [s.number, s]));
  // Display groups ordered by number, smallest first.
  const sortedGroups = [...groups].sort((a, b) => Number(a.number) - Number(b.number));

  /**
   * Drive a chunked group action to completion: re-call it until `done`, showing
   * live progress and accumulating the create/delete/update counts. Stops if a
   * round makes no progress. `onDone` always runs (refresh + cleanup).
   */
  function runChunked(action: () => Promise<GroupActionResult>, onDone: () => void) {
    startTransition(async () => {
      const id = toast.loading(dict.groups.progress.replace("{done}", "0").replace("{total}", "…"));
      let total = 0;
      let created = 0;
      let deleted = 0;
      let updated = 0;
      let prevRemaining = Infinity;
      try {
        for (let guard = 0; guard < 500; guard++) {
          const res = await action();
          created += res.created ?? 0;
          deleted += res.deleted ?? 0;
          updated += res.updated ?? 0;
          if (res.done) {
            toast.success(
              created + deleted + updated > 0
                ? dict.groups.syncSummary
                    .replace("{created}", String(created))
                    .replace("{deleted}", String(deleted))
                    .replace("{updated}", String(updated))
                : dict.groups.updated,
              { id },
            );
            return;
          }
          // No chunk ran (validation/conflict) → surface and stop.
          if (res.total === undefined) {
            toast.error(res.error ?? dict.errors.unknown, { id });
            return;
          }
          if (total === 0) total = res.total;
          // Stuck = the server's remaining didn't shrink. Using remaining (not the
          // op count) counts registry-only prunes as progress, so a chunk that
          // deletes phantom names doesn't read as stuck.
          const remaining = res.remaining ?? 0;
          if (remaining >= prevRemaining) {
            toast.error(res.error ?? dict.errors.unknown, { id });
            return;
          }
          prevRemaining = remaining;
          toast.loading(
            dict.groups.progress
              .replace("{done}", String(total - remaining))
              .replace("{total}", String(total)),
            { id },
          );
        }
        toast.error(dict.errors.unknown, { id }); // guard exhausted (unreachable in practice)
      } finally {
        onDone();
        router.refresh();
      }
    });
  }

  /**
   * Like runChunked but offset-based, for renumber: its personal-password PATCHes
   * aren't state-detectable, so the client passes how many ops are done and loops
   * until `done` (a single pass over the op list). Errors are surfaced at the end.
   */
  function runOffset(
    action: (offset: number) => Promise<GroupActionResult>,
    onDone: () => void,
  ) {
    startTransition(async () => {
      const id = toast.loading(dict.groups.progress.replace("{done}", "0").replace("{total}", "…"));
      let offset = 0;
      let total = 0;
      let created = 0;
      let deleted = 0;
      let updated = 0;
      let errorCount = 0;
      try {
        for (let guard = 0; guard < 500; guard++) {
          const res = await action(offset);
          if (res.total === undefined) {
            // Validation/lookup error — no chunk ran.
            toast.error(res.error ?? dict.errors.unknown, { id });
            return;
          }
          offset = res.offset ?? offset;
          total = res.total;
          created += res.created ?? 0;
          deleted += res.deleted ?? 0;
          updated += res.updated ?? 0;
          errorCount += res.sync?.errors.length ?? 0;
          if (res.done) {
            if (errorCount > 0) {
              toast.error(dict.groups.syncErrors.replace("{count}", String(errorCount)), { id });
            } else {
              toast.success(
                created + deleted + updated > 0
                  ? dict.groups.syncSummary
                      .replace("{created}", String(created))
                      .replace("{deleted}", String(deleted))
                      .replace("{updated}", String(updated))
                  : dict.groups.updated,
                { id },
              );
            }
            return;
          }
          toast.loading(
            dict.groups.progress.replace("{done}", String(offset)).replace("{total}", String(total)),
            { id },
          );
        }
        toast.error(dict.errors.unknown, { id }); // guard exhausted (unreachable in practice)
      } finally {
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" data-icon="inline-start" />
          {dict.groups.createGroup}
        </Button>
      </div>

      {sortedGroups.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{dict.groups.noGroups}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map((group) => {
            const stat = statByNumber.get(group.number);
            const userCount = stat?.presentUsers.length ?? 0;
            return (
              <Card key={group.number} className="gap-3">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  {/* Title -> renumber */}
                  <button
                    type="button"
                    onClick={() => setRenumberTarget(group)}
                    className="-m-1 cursor-pointer rounded-md p-1 text-left"
                    title={dict.groups.renumber}
                  >
                    <span className="flex items-center gap-1 text-2xl font-bold tracking-tight">
                      <HashIcon className="size-5 text-muted-foreground" />
                      {group.number}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(group)}
                    disabled={isPending}
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Members -> edit members */}
                  <button
                    type="button"
                    onClick={() => setMembersTarget(group)}
                    className="-mx-1 block w-full cursor-pointer rounded-md px-1 py-1 text-left"
                    title={dict.groups.editMembers}
                  >
                    <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                      {dict.groups.memberList} ({group.members.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.members.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        group.members.map((m) => (
                          <Badge key={m} variant="secondary" className="font-mono">
                            {m}
                          </Badge>
                        ))
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{dict.groups.totalUsers}</span>
                    <span className="ml-auto font-semibold tabular-nums">{userCount}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={isPending}
        onSubmit={(number, members) =>
          runChunked(() => createGroupAction(number, members), () => setCreateOpen(false))
        }
      />

      <RenumberDialog
        key={`renumber-${renumberTarget?.number ?? "none"}`}
        group={renumberTarget}
        onClose={() => setRenumberTarget(null)}
        pending={isPending}
        onSubmit={(newNumber) =>
          runOffset(
            (offset) => renumberGroupAction(renumberTarget!.number, newNumber, offset),
            () => setRenumberTarget(null),
          )
        }
      />

      <EditMembersDialog
        key={`members-${membersTarget?.number ?? "none"}`}
        group={membersTarget}
        onClose={() => setMembersTarget(null)}
        pending={isPending}
        onSubmit={(members) =>
          runChunked(
            () => updateMembersAction(membersTarget!.number, members),
            () => setMembersTarget(null),
          )
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={dict.groups.deleteGroup}
        description={dict.groups.deleteGroupConfirm.replace("{number}", deleteTarget?.number ?? "")}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        destructive
        pending={isPending}
        onConfirm={() =>
          runChunked(() => deleteGroupAction(deleteTarget!.number, true), () => setDeleteTarget(null))
        }
      />
    </div>
  );
}

function CreateGroupDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (number: string, members: string[]) => void;
}) {
  const dict = useDict();
  const [number, setNumber] = useState("");
  const [members, setMembers] = useState("");

  // Reset fields whenever the dialog is (re)opened.
  function handleOpenChange(next: boolean) {
    if (next) {
      setNumber("");
      setMembers("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.groups.createGroup}</DialogTitle>
          <DialogDescription>{dict.groups.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="group-number">{dict.groups.groupNumber}</Label>
            <Input
              id="group-number"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(digitsOnly(e.target.value))}
              placeholder={dict.groups.groupNumberPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-members">{dict.groups.members}</Label>
            <Input
              id="group-members"
              inputMode="numeric"
              value={members}
              onChange={(e) => setMembers(e.target.value.replace(/[^\d\s,]/g, ""))}
              placeholder={dict.groups.membersPlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {dict.common.cancel}
          </Button>
          <Button
            onClick={() => onSubmit(number, parseMembers(members))}
            disabled={pending || !number.trim()}
          >
            {pending ? "..." : dict.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenumberDialog({
  group,
  onClose,
  pending,
  onSubmit,
}: {
  group: Group | null;
  onClose: () => void;
  pending: boolean;
  onSubmit: (newNumber: string) => void;
}) {
  const dict = useDict();
  // Prefilled from the target (component remounts per target via key).
  const [value, setValue] = useState(group?.number ?? "");

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.groups.renumber}</DialogTitle>
          <DialogDescription>{dict.groups.editGroup}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="renumber-input">{dict.groups.newGroupNumber}</Label>
          <Input
            id="renumber-input"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(digitsOnly(e.target.value))}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {dict.common.cancel}
          </Button>
          <Button onClick={() => onSubmit(value)} disabled={pending || !value.trim()}>
            {pending ? "..." : dict.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMembersDialog({
  group,
  onClose,
  pending,
  onSubmit,
}: {
  group: Group | null;
  onClose: () => void;
  pending: boolean;
  onSubmit: (members: string[]) => void;
}) {
  const dict = useDict();
  // Prefilled with the group's current members (remounts per target via key).
  const [value, setValue] = useState(group ? group.members.join(" ") : "");

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.groups.editMembers}</DialogTitle>
          <DialogDescription>{dict.groups.membersPlaceholder}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="members-input">{dict.groups.members}</Label>
          <Input
            id="members-input"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d\s,]/g, ""))}
            placeholder={dict.groups.membersPlaceholder}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {dict.common.cancel}
          </Button>
          <Button onClick={() => onSubmit(parseMembers(value))} disabled={pending}>
            {pending ? "..." : dict.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
