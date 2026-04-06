"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { deletePlayerAction } from "@/lib/actions/players";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { PencilIcon, Trash2Icon, SearchIcon } from "lucide-react";
import type { APIPlayer } from "@/lib/types";

interface PlayerTableProps {
  players: APIPlayer[];
  userMap: Record<string, string>;
  lang: string;
}

export function PlayerTable({ players, userMap, lang }: PlayerTableProps) {
  const dict = useDict();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<APIPlayer | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    const ownerName = userMap[p.userUuid] ?? "";
    return (
      p.name.toLowerCase().includes(q) ||
      ownerName.toLowerCase().includes(q)
    );
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

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={dict.common.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.player.name}</TableHead>
            <TableHead>{dict.player.uuid}</TableHead>
            <TableHead>{dict.player.owner}</TableHead>
            <TableHead>{dict.player.skin}</TableHead>
            <TableHead>{dict.player.skinModel}</TableHead>
            <TableHead>{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {dict.common.noData}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((player) => (
              <TableRow key={player.uuid}>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell className="font-mono text-xs">
                  {player.uuid}
                </TableCell>
                <TableCell>
                  {userMap[player.userUuid] ?? player.userUuid}
                </TableCell>
                <TableCell>
                  {player.skinUrl ? (
                    <Image
                      src={player.skinUrl}
                      alt={player.name}
                      width={32}
                      height={32}
                      className="rounded"
                      unoptimized
                    />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{player.skinModel === "slim" ? dict.player.slim : dict.player.classic}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
    </div>
  );
}
