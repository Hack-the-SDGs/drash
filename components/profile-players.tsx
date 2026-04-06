"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { deletePlayerAction } from "@/lib/actions/players";
import { canDeletePlayer } from "@/lib/permissions";
import { CreatePlayerDialog } from "@/components/create-player-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlayerHead } from "@/components/player-head";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2Icon, PlusIcon } from "lucide-react";
import type { APIPlayer, Role } from "@/lib/types";

interface ProfilePlayersProps {
  players: (APIPlayer & { skinUrl: string; capeUrl: string; isMojang: boolean })[];
  userUuid: string;
  username: string;
  userRole: Role;
  maxPlayerCount: number;
  isStaff: boolean;
  lang: string;
}

export function ProfilePlayers({
  players,
  userUuid,
  username,
  userRole,
  maxPlayerCount,
  isStaff,
  lang,
}: ProfilePlayersProps) {
  const dict = useDict();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ uuid: string; name: string } | null>(null);

  function handleDeletePlayer() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePlayerAction(deleteTarget.uuid);
      if (result.success) {
        toast.success(dict.player.deleted);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
      setDeleteTarget(null);
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{dict.profile.myPlayers}</h2>
          <Badge variant="secondary">
            {dict.common.total.replace("{count}", String(players.length))}
          </Badge>
          {(isStaff || userRole === "admin" || userRole === "root") && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" data-icon="inline-start" />
              {dict.profile.createPlayer}
            </Button>
          )}
        </div>

        {players.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {dict.common.noData}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => {
              const canManage = isStaff || userRole === "admin" || userRole === "root";
              const canDelete = canManage && canDeletePlayer(userRole, username, player.name, username, userRole);

              return (
                <Card key={player.uuid} className="transition-colors hover:bg-muted/50">
                  <Link href={`/${lang}/players/${player.uuid}`} className="block">
                    <CardContent className="flex items-start gap-4 p-4">
                      <PlayerHead skinUrl={player.skinUrl} size={48} className="shrink-0" />
                      <div className="flex-1 space-y-1.5 overflow-hidden">
                        <p className="truncate text-sm font-medium">{player.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{player.uuid}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {dict.profile.skinModel}: {player.skinModel === "slim" ? dict.player.slim : dict.player.classic}
                          </Badge>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteTarget({ uuid: player.uuid, name: player.name });
                          }}
                          disabled={!canDelete || isPending}
                          title={!canDelete ? dict.users.cannotDeleteSameNamePlayer : undefined}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {(isStaff || userRole === "admin" || userRole === "root") && (
        <>
          <CreatePlayerDialog open={createOpen} onOpenChange={setCreateOpen} userUuid={userUuid} isStaffMode />
          <ConfirmDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            title={dict.profile.deletePlayer}
            description={dict.profile.deletePlayerConfirm}
            confirmLabel={dict.common.delete}
            destructive
            onConfirm={handleDeletePlayer}
            pending={isPending}
          />
        </>
      )}
    </>
  );
}
