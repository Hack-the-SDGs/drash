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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteCascadeDialog } from "@/components/delete-cascade-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  createTopicAction,
  updateTopicNameAction,
  deleteTopicAction,
  type TopicActionResult,
} from "@/lib/actions/topics";
import type { Topic, TopicType } from "@/lib/groups/types";

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

  const countByCode = new Map(stats.map((s) => [s.code, s.accountCount]));

  function run(action: () => Promise<TopicActionResult>, successMsg: string, onDone: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? dict.errors.unknown);
        return;
      }
      toast.success(
        result.sync ? successMsg.replace("{created}", String(result.sync.created)) : successMsg,
      );
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
                <TableHead className="text-right">{dict.topics.accountCount}</TableHead>
                <TableHead>{dict.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow key={topic.code}>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell className="font-mono text-xs">{topic.code}</TableCell>
                  <TableCell>
                    <Badge variant={topic.type === "group" ? "default" : "secondary"}>
                      {topic.type === "group" ? dict.topics.group : dict.topics.personal}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {countByCode.get(topic.code) ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRenameTarget(topic)}
                        disabled={isPending}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(topic)}
                        disabled={isPending}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </div>
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
        onSubmit={(name, code, type) =>
          run(() => createTopicAction(name, code, type), dict.topics.created, () =>
            setCreateOpen(false),
          )
        }
      />

      <RenameTopicDialog
        topic={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        pending={isPending}
        onSubmit={(name) =>
          run(
            () => updateTopicNameAction(renameTarget!.code, name),
            dict.topics.renamed,
            () => setRenameTarget(null),
          )
        }
      />

      <DeleteCascadeDialog
        key={deleteTarget?.code ?? "none"}
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={dict.topics.deleteTopic}
        description={dict.topics.deleteTopicConfirm.replace("{name}", deleteTarget?.name ?? "")}
        cascadeLabel={dict.topics.deleteGeneratedUsers}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        pending={isPending}
        onConfirm={(deleteUsers) =>
          run(
            () => deleteTopicAction(deleteTarget!.code, deleteUsers),
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
  onSubmit: (name: string, code: string, type: TopicType) => void;
}) {
  const dict = useDict();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<TopicType>("personal");

  function handleOpenChange(next: boolean) {
    if (next) {
      setName("");
      setCode("");
      setType("personal");
    }
    onOpenChange(next);
  }

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
            <Label>{dict.topics.type}</Label>
            <div className="grid grid-cols-2 gap-2">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setType(o.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
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
            onClick={() => onSubmit(name, code, type)}
            disabled={pending || !name.trim() || !code.trim()}
          >
            {pending ? "..." : dict.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameTopicDialog({
  topic,
  onOpenChange,
  pending,
  onSubmit,
}: {
  topic: Topic | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (name: string) => void;
}) {
  const dict = useDict();
  const [value, setValue] = useState("");

  return (
    <Dialog
      open={topic !== null}
      onOpenChange={(open) => {
        if (open && topic) setValue(topic.name);
        onOpenChange(open);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dict.topics.rename}</DialogTitle>
          <DialogDescription>{topic?.code}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rename-topic">{dict.topics.topicName}</Label>
          <Input
            id="rename-topic"
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
