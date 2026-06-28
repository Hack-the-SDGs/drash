"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
  setTopicOpenAction,
  type TopicActionResult,
} from "@/lib/actions/topics";
import { MAX_BOT_COUNT, type Topic, type TopicType } from "@/lib/groups/types";

/** Valid bot count input: an integer in [1, MAX_BOT_COUNT]. */
function isBotCountValid(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_BOT_COUNT;
}

export interface TopicStat {
  code: string;
  accountCount: number;
}

interface TopicManagerProps {
  topics: Topic[];
  stats: TopicStat[];
}

export function TopicManager({ topics, stats }: TopicManagerProps) {
  const dict = useDict();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Topic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  // Code of the topic whose open/closed switch is currently applying.
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const countByCode = new Map(stats.map((s) => [s.code, s.accountCount]));

  /** Open/close a topic: locks or unlocks its accounts. Disabled until done. */
  function handleToggleOpen(topic: Topic, open: boolean) {
    setTogglingCode(topic.code);
    startTransition(async () => {
      const result = await setTopicOpenAction(topic.code, open);
      if (!result.success) {
        toast.error(result.error ?? dict.errors.unknown);
      } else {
        const count = result.sync?.updated ?? 0;
        toast.success(
          (open ? dict.topics.opened : dict.topics.closed).replace("{count}", String(count)),
        );
        if (result.sync && result.sync.errors.length > 0) {
          toast.error(dict.groups.syncErrors.replace("{count}", String(result.sync.errors.length)));
        }
      }
      setTogglingCode(null);
      router.refresh();
    });
  }

  function run(action: () => Promise<TopicActionResult>, successMsg: string, onDone: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? dict.errors.unknown);
        return;
      }
      toast.success(successMsg.replace("{created}", String(result.sync?.created ?? 0)));
      if (result.sync && result.sync.errors.length > 0) {
        toast.error(dict.groups.syncErrors.replace("{count}", String(result.sync.errors.length)));
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
          {dict.topics.createTopic}
        </Button>
      </div>

      {topics.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{dict.topics.noTopics}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.topics.topicName}</TableHead>
                <TableHead>{dict.topics.codeColumn}</TableHead>
                <TableHead>{dict.topics.type}</TableHead>
                <TableHead className="text-right">{dict.topics.botCount}</TableHead>
                <TableHead className="text-right">{dict.topics.accountCount}</TableHead>
                <TableHead>{dict.topics.open}</TableHead>
                <TableHead className="w-[60px]">{dict.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.code}
                  className="cursor-pointer"
                  onClick={() => setRenameTarget(topic)}
                >
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell className="font-mono text-xs">{topic.code}</TableCell>
                  <TableCell>
                    <Badge variant={topic.type === "group" ? "default" : "secondary"}>
                      {topic.type === "group" ? dict.topics.group : dict.topics.personal}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{topic.botCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {countByCode.get(topic.code) ?? 0}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={topic.open}
                      disabled={togglingCode === topic.code}
                      onCheckedChange={(open) => handleToggleOpen(topic, open)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(topic)}
                      disabled={isPending}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateTopicDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={isPending}
        onSubmit={(name, code, type, botCount) =>
          run(() => createTopicAction(name, code, type, botCount), dict.topics.created, () =>
            setCreateOpen(false),
          )
        }
      />

      <EditTopicDialog
        key={`edit-${renameTarget?.code ?? "none"}`}
        topic={renameTarget}
        onClose={() => setRenameTarget(null)}
        pending={isPending}
        onSubmit={(name, botCount) =>
          run(
            () => updateTopicAction(renameTarget!.code, name, botCount),
            dict.topics.renamed,
            () => setRenameTarget(null),
          )
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={dict.topics.deleteTopic}
        description={dict.topics.deleteTopicConfirm.replace("{name}", deleteTarget?.name ?? "")}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        destructive
        pending={isPending}
        onConfirm={() =>
          run(
            () => deleteTopicAction(deleteTarget!.code, true),
            dict.topics.deleted,
            () => setDeleteTarget(null),
          )
        }
      />
    </div>
  );
}

function CreateTopicDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (name: string, code: string, type: TopicType, botCount: number) => void;
}) {
  const dict = useDict();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<TopicType>("personal");
  const [botCount, setBotCount] = useState("1");

  function handleOpenChange(next: boolean) {
    if (next) {
      setName("");
      setCode("");
      setType("personal");
      setBotCount("1");
    }
    onOpenChange(next);
  }

  const botCountValid = isBotCountValid(botCount);

  const options: { value: TopicType; label: string; hint: string }[] = [
    { value: "personal", label: dict.topics.personal, hint: dict.topics.personalHint },
    { value: "group", label: dict.topics.group, hint: dict.topics.groupHint },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.topics.createTopic}</DialogTitle>
          <DialogDescription>{dict.topics.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="topic-name">{dict.topics.topicName}</Label>
            <Input
              id="topic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dict.topics.topicNamePlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-code">{dict.topics.topicCode}</Label>
            <Input
              id="topic-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={dict.topics.topicCodePlaceholder}
            />
            <p className="text-xs text-muted-foreground">{dict.topics.topicCodeHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-botcount">{dict.topics.botCount}</Label>
            <Input
              id="topic-botcount"
              inputMode="numeric"
              value={botCount}
              onChange={(e) => setBotCount(e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-xs text-muted-foreground">{dict.topics.botCountHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{dict.topics.type}</Label>
            <div className="grid grid-cols-2 gap-2">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setType(o.value)}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left transition-colors",
                    type === o.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="text-sm font-medium">{o.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{o.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {dict.common.cancel}
          </Button>
          <Button
            onClick={() => onSubmit(name, code, type, Number(botCount))}
            disabled={pending || !name.trim() || !code.trim() || !botCountValid}
          >
            {pending ? "..." : dict.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTopicDialog({
  topic,
  onClose,
  pending,
  onSubmit,
}: {
  topic: Topic | null;
  onClose: () => void;
  pending: boolean;
  onSubmit: (name: string, botCount: number) => void;
}) {
  const dict = useDict();
  // Prefilled with the topic's current values (remounts per target via key).
  const [name, setName] = useState(topic?.name ?? "");
  const [botCount, setBotCount] = useState(String(topic?.botCount ?? 1));

  const botCountValid = isBotCountValid(botCount);

  return (
    <Dialog open={topic !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.topics.rename}</DialogTitle>
          <DialogDescription>{topic?.code}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-topic-name">{dict.topics.topicName}</Label>
            <Input
              id="edit-topic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-topic-botcount">{dict.topics.botCount}</Label>
            <Input
              id="edit-topic-botcount"
              inputMode="numeric"
              value={botCount}
              onChange={(e) => setBotCount(e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-xs text-muted-foreground">{dict.topics.botCountHint}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {dict.common.cancel}
          </Button>
          <Button
            onClick={() => onSubmit(name, Number(botCount))}
            disabled={pending || !name.trim() || !botCountValid}
          >
            {pending ? "..." : dict.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
