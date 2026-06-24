"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { createPlayerAction } from "@/lib/actions/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { APIUser } from "@/lib/types";

interface CreatePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-set when opened from a user page. */
  userUuid?: string;
  /** Provided when opened from players page (for owner selection). */
  users?: APIUser[];
  /** Staff mode: restricted to own players only. */
  isStaffMode?: boolean;
}

export function CreatePlayerDialog({
  open,
  onOpenChange,
  userUuid,
  users,
  isStaffMode,
}: CreatePlayerDialogProps) {
  const dict = useDict();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [skinModel, setSkinModel] = useState<string>("classic");
  const [selectedUserUuid, setSelectedUserUuid] = useState(userUuid ?? "");

  const [mojangUsername, setMojangUsername] = useState("");

  function resetState() {
    setMode("new");
    setSkinModel("classic");
    setMojangUsername("");
    setSelectedUserUuid(userUuid ?? "");
  }

  function handleSubmit(formData: FormData) {
    const ownerUuid = userUuid ?? selectedUserUuid;
    if (ownerUuid) formData.set("userUuid", ownerUuid);
    if (skinModel) formData.set("skinModel", skinModel);

    if (mode === "existing") {
      formData.set("name", mojangUsername.trim());
      formData.set("existingPlayer", "true");
    }

    startTransition(async () => {
      const result = await createPlayerAction(formData);
      if (result.success) {
        toast.success(dict.player.saved);
        resetState();
        onOpenChange(false);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  const needsOwnerSelection = !userUuid && !isStaffMode && users;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dict.player.createPlayer}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("new")}
            >
              {dict.player.newPlayer}
            </Button>
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("existing")}
            >
              {dict.player.existingPlayerMode}
            </Button>
          </div>

          {/* Owner selection (only when opened from players page) */}
          {needsOwnerSelection && (
            <div className="space-y-1.5">
              <Label>{dict.player.selectOwner}</Label>
              <Select
                value={selectedUserUuid}
                onValueChange={(v) => setSelectedUserUuid(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dict.player.selectOwner} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.uuid} value={u.uuid}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "new" ? (
            <>
              {/* Player name */}
              <div className="space-y-1.5">
                <Label htmlFor="create-player-name">{dict.player.name}</Label>
                <Input id="create-player-name" name="name" required />
              </div>

              {/* Skin model */}
              <div className="space-y-1.5">
                <Label>{dict.player.skinModel}</Label>
                <Select value={skinModel} onValueChange={(v) => setSkinModel(v ?? "classic")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">{dict.player.classic}</SelectItem>
                    <SelectItem value="slim">{dict.player.slim}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Skin/Cape file uploads */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-skinFile">{dict.player.uploadSkin}</Label>
                  <Input
                    id="create-skinFile"
                    name="skinFile"
                    type="file"
                    accept="image/png"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-capeFile">{dict.player.uploadCape}</Label>
                  <Input
                    id="create-capeFile"
                    name="capeFile"
                    type="file"
                    accept="image/png"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>{dict.player.mojangUsername}</Label>
              <Input
                value={mojangUsername}
                onChange={(e) => setMojangUsername(e.target.value)}
                placeholder="Steve"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
              {dict.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                (needsOwnerSelection && !selectedUserUuid) ||
                (mode === "existing" && !mojangUsername.trim())
              }
            >
              {isPending ? dict.common.loading : dict.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
