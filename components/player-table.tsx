"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PlayerHead } from "@/components/player-head";
import { useDict } from "@/components/dict-provider";
import { deletePlayerAction } from "@/lib/actions/players";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CreatePlayerDialog } from "@/components/create-player-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, Trash2Icon, SearchIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { useSortable } from "@/hooks/use-sortable";
import type { APIPlayer, APIUser } from "@/lib/types";

interface PlayerTableProps {
  players: APIPlayer[];
  userMap: Record<string, string>;
  users: APIUser[];
  lang: string;
}

export function PlayerTable({ players, userMap, users, lang }: PlayerTableProps) {
  const dict = useDict();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<APIPlayer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const ownerName = userMap[p.userUuid] ?? "";
    return (
      p.name.toLowerCase().includes(q) ||
      ownerName.toLowerCase().includes(q)
    );
  });

  const { sorted, sortKey, direction, toggleSort } = useSortable(filtered, {
    defaultKey: "name",
    defaultDirection: "asc",
    sortFns: {
      name: (a, b) => a.name.localeCompare(b.name),
      owner: (a, b) => {
        const ownerA = userMap[a.userUuid] ?? "";
        const ownerB = userMap[b.userUuid] ?? "";
        return ownerA.localeCompare(ownerB);
      },
      skinModel: (a, b) => a.skinModel.localeCompare(b.skinModel),
      createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  });

  function handleDelete(player: APIPlayer) {
    startTransition(async () => {
      const result = await deletePlayerAction(player.uuid);
      if (result.success) {
        toast.success(dict.player.deleted);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (sortKey !== colKey) return null;
    return direction === "asc"
      ? <ArrowUpIcon className="inline size-3 ml-1" />
      : <ArrowDownIcon className="inline size-3 ml-1" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={dict.common.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary" className="whitespace-nowrap">
          {dict.common.total.replace("{count}", String(filtered.length))}
        </Badge>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" data-icon="inline-start" />
          {dict.player.createPlayer}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center"
                  onClick={() => toggleSort("name")}
                >
                  {dict.player.name}
                  <SortIcon colKey="name" />
                </button>
              </TableHead>
              <TableHead>{dict.player.uuid}</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center"
                  onClick={() => toggleSort("owner")}
                >
                  {dict.player.owner}
                  <SortIcon colKey="owner" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center"
                  onClick={() => toggleSort("skinModel")}
                >
                  {dict.player.skinModel}
                  <SortIcon colKey="skinModel" />
                </button>
              </TableHead>
              <TableHead>{dict.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {dict.common.noData}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((player) => (
                <TableRow key={player.uuid}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlayerHead skinUrl={player.skinUrl} size={32} />
                      <Link
                        href={`/${lang}/admin/players/${player.uuid}`}
                        className="font-medium hover:underline"
                      >
                        {player.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {player.uuid}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/${lang}/admin/users/${player.userUuid}`}
                      className="hover:underline"
                    >
                      {userMap[player.userUuid] ?? player.userUuid}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{player.skinModel === "slim" ? dict.player.slim : dict.player.classic}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        nativeButton={false}
                        render={<Link href={`/${lang}/admin/players/${player.uuid}`} />}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(player)}
                        disabled={isPending}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </div>
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
        title={dict.common.delete}
        description={`${dict.common.confirm}: ${deleteTarget?.name ?? ""}?`}
        confirmLabel={dict.common.delete}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        destructive
      />

      <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} users={users} />
    </div>
  );
}
