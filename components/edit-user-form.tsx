"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateUserAction,
  deleteUserAction,
  resetApiTokenAction,
  resetMinecraftTokenAction,
  lockUserAction,
  unlockUserAction,
  setAdminAction,
  createUserOIDCAction,
  deleteUserOIDCAction,
} from "@/lib/actions/users";
import { createPlayerAction } from "@/lib/actions/players";
import { useDict } from "@/components/dict-provider";
import { toast } from "sonner";
import type { APIUser, Role } from "@/lib/types";
import {
  CopyIcon,
  Trash2Icon,
  PlusIcon,
  KeyIcon,
  LinkIcon,
  UnlinkIcon,
} from "lucide-react";

interface EditUserFormProps {
  user: APIUser;
  lang: string;
  viewerRole: Role;
}

export function EditUserForm({ user, lang, viewerRole }: EditUserFormProps) {
  const dict = useDict();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isRoot = viewerRole === "root";

  // Dialog states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetApiOpen, setResetApiOpen] = useState(false);
  const [resetMcOpen, setResetMcOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addOidcOpen, setAddOidcOpen] = useState(false);
  const [removeOidcIssuer, setRemoveOidcIssuer] = useState<string | null>(null);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(dict.common.copiedToClipboard);
  }

  // -- Password section --
  function handlePasswordSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateUserAction(user.uuid, formData);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error);
      }
    });
  }

  // -- Status section --
  function handleStatusSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateUserAction(user.uuid, formData);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error);
      }
    });
  }

  // -- Lock/Unlock --
  function handleLockToggle() {
    startTransition(async () => {
      const action = user.isLocked ? unlockUserAction : lockUserAction;
      const result = await action(user.uuid);
      if (result.success) {
        toast.success(
          user.isLocked ? dict.users.unlocked : dict.users.locked,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  // -- Admin toggle --
  function handleAdminToggle() {
    startTransition(async () => {
      const result = await setAdminAction(user.uuid, !user.isAdmin);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error);
      }
    });
  }

  // -- Token resets --
  function handleResetApiToken() {
    startTransition(async () => {
      const result = await resetApiTokenAction(user.uuid);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error);
      }
      setResetApiOpen(false);
    });
  }

  function handleResetMinecraftToken() {
    startTransition(async () => {
      const result = await resetMinecraftTokenAction(user.uuid);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error);
      }
      setResetMcOpen(false);
    });
  }

  // -- Delete --
  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAction(user.uuid);
      if (result.success) {
        toast.success(dict.users.deleted);
        router.push(`/${lang}/admin/users`);
      } else {
        toast.error(result.error);
        setDeleteOpen(false);
      }
    });
  }

  // -- Add Player --
  function handleAddPlayer(formData: FormData) {
    formData.set("userUuid", user.uuid);
    startTransition(async () => {
      const result = await createPlayerAction(formData);
      if (result.success) {
        toast.success(dict.users.updated);
        setAddPlayerOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  // -- OIDC --
  function handleAddOidc(formData: FormData) {
    startTransition(async () => {
      const result = await createUserOIDCAction(user.uuid, formData);
      if (result.success) {
        toast.success(dict.users.updated);
        setAddOidcOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemoveOidc() {
    if (!removeOidcIssuer) return;
    const fd = new FormData();
    fd.set("issuer", removeOidcIssuer);
    startTransition(async () => {
      const result = await deleteUserOIDCAction(user.uuid, fd);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error);
      }
      setRemoveOidcIssuer(null);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.users.editUser}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{dict.users.username}</Label>
              <Input value={user.username} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>UUID</Label>
              <div className="flex gap-2">
                <Input value={user.uuid} disabled className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(user.uuid)}
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.isAdmin && <Badge>{dict.users.isAdmin}</Badge>}
            {user.isLocked && (
              <Badge variant="destructive">{dict.users.isLocked}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.users.password}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handlePasswordSubmit} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="password">{dict.users.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {dict.common.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleStatusSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxPlayerCount">{dict.users.maxPlayerCount}</Label>
                <Input
                  id="maxPlayerCount"
                  name="maxPlayerCount"
                  type="number"
                  min={0}
                  defaultValue={user.maxPlayerCount}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="preferredLanguage">{dict.users.preferredLanguage}</Label>
                <Input
                  id="preferredLanguage"
                  name="preferredLanguage"
                  defaultValue={user.preferredLanguage}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {dict.common.save}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleLockToggle}
                disabled={isPending}
              >
                {user.isLocked ? dict.users.unlock : dict.users.lock}
              </Button>
              {isRoot && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAdminToggle}
                  disabled={isPending}
                >
                  {user.isAdmin
                    ? dict.admins.demote
                    : dict.admins.promote}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Tokens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setResetApiOpen(true)}
            disabled={isPending}
          >
            <KeyIcon className="size-4" data-icon="inline-start" />
            {dict.users.resetApiToken}
          </Button>
          <Button
            variant="outline"
            onClick={() => setResetMcOpen(true)}
            disabled={isPending}
          >
            <KeyIcon className="size-4" data-icon="inline-start" />
            {dict.users.resetMinecraftToken}
          </Button>
        </CardContent>
      </Card>

      {/* Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{dict.users.players}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddPlayerOpen(true)}
            >
              <PlusIcon className="size-4" data-icon="inline-start" />
              {dict.users.addPlayer}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.players || user.players.length === 0) ? (
            <p className="text-sm text-muted-foreground">{dict.common.noData}</p>
          ) : (
            <div className="space-y-2">
              {user.players.map((player) => (
                <div
                  key={player.uuid}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{player.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">
                      {player.uuid}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link href={`/${lang}/admin/players/${player.uuid}`} />
                    }
                  >
                    {dict.common.edit}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OIDC Identities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{dict.users.oidcIdentities}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOidcOpen(true)}
            >
              <LinkIcon className="size-4" data-icon="inline-start" />
              {dict.users.addOidc}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.oidcIdentities || user.oidcIdentities.length === 0) ? (
            <p className="text-sm text-muted-foreground">{dict.common.noData}</p>
          ) : (
            <div className="space-y-2">
              {user.oidcIdentities.map((oidc) => (
                <div
                  key={`${oidc.issuer}-${oidc.subject}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {oidc.oidcProviderName && (
                        <Badge variant="secondary">{oidc.oidcProviderName}</Badge>
                      )}
                      <span className="truncate text-sm font-mono">
                        {oidc.issuer}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {dict.users.subject}: {oidc.subject}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRemoveOidcIssuer(oidc.issuer)}
                  >
                    <UnlinkIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{dict.users.deleteUser}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash2Icon className="size-4" data-icon="inline-start" />
            {dict.users.deleteUser}
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={dict.users.deleteUser}
        description={dict.users.deleteUserConfirm}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        destructive
        onConfirm={handleDelete}
        pending={isPending}
      />

      <ConfirmDialog
        open={resetApiOpen}
        onOpenChange={setResetApiOpen}
        title={dict.users.resetApiToken}
        description={dict.users.resetApiToken + "?"}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={handleResetApiToken}
        pending={isPending}
      />

      <ConfirmDialog
        open={resetMcOpen}
        onOpenChange={setResetMcOpen}
        title={dict.users.resetMinecraftToken}
        description={dict.users.resetMinecraftToken + "?"}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={handleResetMinecraftToken}
        pending={isPending}
      />

      <ConfirmDialog
        open={removeOidcIssuer !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveOidcIssuer(null);
        }}
        title={dict.users.removeOidc}
        description={dict.users.removeOidc + "?"}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        destructive
        onConfirm={handleRemoveOidc}
        pending={isPending}
      />

      {/* Add Player Dialog */}
      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.users.addPlayer}</DialogTitle>
          </DialogHeader>
          <form action={handleAddPlayer} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playerName">{dict.player.name}</Label>
              <Input
                id="playerName"
                name="name"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playerFallback">{dict.player.fallbackPlayer}</Label>
              <Input
                id="playerFallback"
                name="fallbackPlayer"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddPlayerOpen(false)}
              >
                {dict.common.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? dict.common.loading : dict.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add OIDC Dialog */}
      <Dialog open={addOidcOpen} onOpenChange={setAddOidcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.users.addOidc}</DialogTitle>
          </DialogHeader>
          <form action={handleAddOidc} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="oidcIssuer">{dict.users.issuer}</Label>
              <Input
                id="oidcIssuer"
                name="issuer"
                required
                placeholder="https://accounts.google.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="oidcSubject">{dict.users.subject}</Label>
              <Input
                id="oidcSubject"
                name="subject"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOidcOpen(false)}
              >
                {dict.common.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? dict.common.loading : dict.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
