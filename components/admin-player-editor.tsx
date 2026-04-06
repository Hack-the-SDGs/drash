"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { updatePlayerAction, deletePlayerAction } from "@/lib/actions/players";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SkinEditor } from "@/components/skin-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Trash2Icon, SaveIcon } from "lucide-react";
import type { APIPlayer } from "@/lib/types";

interface AdminPlayerEditorProps {
  player: APIPlayer;
  ownerUsername?: string;
  lang: string;
  isMojang: boolean;
}

export function AdminPlayerEditor({
  player,
  ownerUsername,
  lang,
  isMojang,
}: AdminPlayerEditorProps) {
  const dict = useDict();
  const router = useRouter();
  const [name, setName] = useState(player.name);
  const [fallbackPlayer, setFallbackPlayer] = useState(player.fallbackPlayer);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("fallbackPlayer", fallbackPlayer);

      const result = await updatePlayerAction(player.uuid, formData);
      if (result.success) {
        toast.success(dict.player.saved);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePlayerAction(player.uuid);
      if (result.success) {
        toast.success(dict.player.deleted);
        router.push(`/${lang}/admin/players`);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Player Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.player.title}</CardTitle>
          <CardDescription>
            {dict.player.uuid}: {player.uuid}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="player-name">{dict.player.name}</Label>
              <Input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fallback-player">{dict.player.fallbackPlayer}</Label>
              <Input
                id="fallback-player"
                value={fallbackPlayer}
                onChange={(e) => setFallbackPlayer(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{dict.player.userUuid}</Label>
              <p className="text-sm text-muted-foreground font-mono">
                {player.userUuid}
                {ownerUsername && (
                  <span className="ml-2 font-sans">({ownerUsername})</span>
                )}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{dict.player.offlineUuid}</Label>
              <p className="text-sm text-muted-foreground font-mono">
                {player.offlineUuid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isPending}>
              <SaveIcon className="size-4" />
              {dict.common.save}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
            >
              <Trash2Icon className="size-4" />
              {dict.common.delete}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skin Editor */}
      <SkinEditor
        player={player}
        dict={dict.player}
        commonDict={dict.common}
        lang={lang}
        readonly={isMojang}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={dict.common.delete}
        description={`${dict.common.confirm}: ${player.name}?`}
        confirmLabel={dict.common.delete}
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
