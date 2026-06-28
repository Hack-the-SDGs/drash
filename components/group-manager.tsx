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
import { DeleteCascadeDialog } from "@/components/delete-cascade-dialog";
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

export function GroupManager({ groups, stats }: GroupManagerProps) {
  const dict = useDict();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [renumberTarget, setRenumberTarget] = useState<Group | null>(null);
  const [membersTarget, setMembersTarget] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  const statByNumber = new Map(stats.map((s) => [s.number, s]));

  /** Run an action, surface the result, and refresh the server data on success. */
  function run(action: () => Promise<GroupActionResult>, onDone: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? dict.errors.unknown);
        return;
      }
      if (result.sync) {
        const { created, deleted, updated, errors } = result.sync;
        toast.success(
          dict.groups.syncSummary
            .replace("{created}", String(created))
            .replace("{deleted}", String(deleted))
            .replace("{updated}", String(updated)),
        );
        if (errors.length > 0) {
          toast.error(dict.groups.syncErrors.replace("{count}", String(errors.length)));
        }
      } else {
        toast.success(dict.groups.updated);
      }
      onDone();
      router.refresh();
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

      {groups.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{dict.groups.noGroups}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const stat = statByNumber.get(group.number);
            const userCount = stat?.presentUsers.length ?? 0;
            return (
              <Card key={group.number} className="gap-3 transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  {/* Title -> renumber */}
                  <button
                    type="button"
                    onClick={() => setRenumberTarget(group)}
                    className="group/title -m-1 rounded-md p-1 text-left transition-colors hover:bg-muted"
                    title={dict.groups.renumber}
                  >
                    <span className="flex items-center gap-1 text-2xl font-bold tracking-tight">
                      <HashIcon className="size-5 text-muted-foreground group-hover/title:text-foreground" />
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
                  {/* Members -> edit members; hover reveals the full user list */}
                  <button
                    type="button"
                    onClick={() => setMembersTarget(group)}
                    className="group/members relative -mx-1 block w-full rounded-md px-1 py-1 text-left transition-colors hover:bg-muted"
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
                    {/* Hover panel: full generated user list */}
                    <div className="invisible absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-2 text-xs shadow-lg ring-1 ring-foreground/10 group-hover/members:visible">
                      <div className="mb-1 font-medium">{dict.groups.fullUserList}</div>
                      {stat && stat.presentUsers.length > 0 ? (
                        <ul className="space-y-0.5 font-mono">
                          {stat.presentUsers.map((u) => (
                            <li key={u}>{u}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">{dict.groups.noUsers}</span>
                      )}
                    </div>
                  </button>

                  {/* Totals; hover shows player count (equals user count) */}
                  <div
                    className="group/count flex items-center gap-2 text-sm"
                    title={`${dict.groups.playerCount}: ${userCount}`}
                  >
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
          run(() => createGroupAction(number, members), () => setCreateOpen(false))
        }
      />

      <RenumberDialog
        group={renumberTarget}
        onOpenChange={(open) => !open && setRenumberTarget(null)}
        pending={isPending}
        onSubmit={(newNumber) =>
          run(
            () => renumberGroupAction(renumberTarget!.number, newNumber),
            () => setRenumberTarget(null),
          )
        }
      />

      <EditMembersDialog
        group={membersTarget}
        onOpenChange={(open) => !open && setMembersTarget(null)}
        pending={isPending}
        onSubmit={(members) =>
          run(
            () => updateMembersAction(membersTarget!.number, members),
            () => setMembersTarget(null),
          )
        }
      />

      <DeleteCascadeDialog
        key={deleteTarget?.number ?? "none"}
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={dict.groups.deleteGroup}
        description={dict.groups.deleteGroupConfirm.replace("{number}", deleteTarget?.number ?? "")}
        cascadeLabel={dict.groups.deleteGeneratedUsers}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        pending={isPending}
        onConfirm={(deleteUsers) =>
          run(
            () => deleteGroupAction(deleteTarget!.number, deleteUsers),
            () => setDeleteTarget(null),
          )
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
              onChange={(e) => setNumber(e.target.value)}
              placeholder={dict.groups.groupNumberPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-members">{dict.groups.members}</Label>
            <Input
              id="group-members"
              value={members}
              onChange={(e) => setMembers(e.target.value)}
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
  onOpenChange,
  pending,
  onSubmit,
}: {
  group: Group | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (newNumber: string) => void;
}) {
  const dict = useDict();
  const [value, setValue] = useState("");

  return (
    <Dialog
      open={group !== null}
      onOpenChange={(open) => {
        if (open && group) setValue(group.number);
        onOpenChange(open);
      }}
    >
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
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
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
  onOpenChange,
  pending,
  onSubmit,
}: {
  group: Group | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (members: string[]) => void;
}) {
  const dict = useDict();
  const [value, setValue] = useState("");

  return (
    <Dialog
      open={group !== null}
      onOpenChange={(open) => {
        if (open && group) setValue(group.members.join(" "));
        onOpenChange(open);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.groups.editMembers}</DialogTitle>
          <DialogDescription>{dict.groups.membersPlaceholder}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="members-input">{dict.groups.members}</Label>
          <Input
            id="members-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dict.groups.membersPlaceholder}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
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
