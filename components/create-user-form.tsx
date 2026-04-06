"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserAction } from "@/lib/actions/users";
import { useDict } from "@/components/dict-provider";
import { toast } from "sonner";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, Loader2Icon } from "lucide-react";
import { lookupMojangUuid } from "@/lib/mojang";

interface CreateUserFormProps {
  lang: string;
  isRoot: boolean;
}

export function CreateUserForm({ lang, isRoot }: CreateUserFormProps) {
  const dict = useDict();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [skinModel, setSkinModel] = useState<string | null>("classic");
  const [existingPlayerChecked, setExistingPlayerChecked] = useState(false);
  const [mojangUsername, setMojangUsername] = useState("");
  const [mojangResult, setMojangResult] = useState<{ uuid: string; name: string } | null>(null);
  const [mojangError, setMojangError] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  async function handleMojangLookup() {
    if (!mojangUsername.trim()) return;
    setIsLookingUp(true);
    setMojangError(false);
    setMojangResult(null);
    const result = await lookupMojangUuid(mojangUsername.trim());
    if (result) {
      setMojangResult(result);
    } else {
      setMojangError(true);
    }
    setIsLookingUp(false);
  }

  function handleSubmit(formData: FormData) {
    if (skinModel) formData.set("skinModel", skinModel);
    if (existingPlayerChecked && mojangResult) {
      formData.set("chosenUuid", mojangResult.uuid);
    }
    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result.success) {
        toast.success(dict.users.created);
        router.push(`/${lang}/admin/users`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{dict.users.createUser}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {/* Basic fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{dict.users.username}</Label>
              <Input
                id="username"
                name="username"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{dict.users.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playerName">{dict.users.playerName}</Label>
              <Input
                id="playerName"
                name="playerName"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{dict.player.skinModel}</Label>
              <Select value={skinModel} onValueChange={setSkinModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">{dict.player.classic}</SelectItem>
                  <SelectItem value="slim">{dict.player.slim}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fallbackPlayer">{dict.users.fallbackPlayer}</Label>
              <Input
                id="fallbackPlayer"
                name="fallbackPlayer"
              />
            </div>
          </div>

          {/* Skin/Cape upload */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skinFile">{dict.player.uploadSkin}</Label>
              <Input
                id="skinFile"
                name="skinFile"
                type="file"
                accept="image/png"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capeFile">{dict.player.uploadCape}</Label>
              <Input
                id="capeFile"
                name="capeFile"
                type="file"
                accept="image/png"
              />
            </div>
          </div>

          {/* Advanced section */}
          <div className="rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-muted/50"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>Advanced</span>
              {showAdvanced ? (
                <ChevronUpIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="border-t p-3 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {isRoot && (
                    <div className="flex items-center gap-2">
                      <input
                        id="isAdmin"
                        name="isAdmin"
                        type="checkbox"
                        value="true"
                        className="size-4 rounded border"
                      />
                      <Label htmlFor="isAdmin">{dict.users.isAdmin}</Label>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      id="isLocked"
                      name="isLocked"
                      type="checkbox"
                      value="true"
                      className="size-4 rounded border"
                    />
                    <Label htmlFor="isLocked">{dict.users.isLocked}</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="existingPlayer"
                      name="existingPlayer"
                      type="checkbox"
                      value="true"
                      checked={existingPlayerChecked}
                      onChange={(e) => setExistingPlayerChecked(e.target.checked)}
                      className="size-4 rounded border"
                    />
                    <Label htmlFor="existingPlayer">{dict.users.existingPlayer}</Label>
                  </div>
                </div>

                {existingPlayerChecked && (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-1.5">
                      <Label>{dict.player.mojangUsername}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={mojangUsername}
                          onChange={(e) => {
                            setMojangUsername(e.target.value);
                            setMojangError(false);
                            setMojangResult(null);
                          }}
                          placeholder="Steve"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleMojangLookup}
                          disabled={isLookingUp || !mojangUsername.trim()}
                        >
                          {isLookingUp ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                          {dict.player.lookupMojang}
                        </Button>
                      </div>
                      {mojangResult && (
                        <p className="text-sm text-green-600">
                          {dict.player.mojangFound.replace("{name}", mojangResult.name)}
                          <span className="ml-1 font-mono text-xs text-muted-foreground">{mojangResult.uuid}</span>
                        </p>
                      )}
                      {mojangError && (
                        <p className="text-sm text-destructive">{dict.player.mojangNotFound}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="maxPlayerCount">{dict.users.maxPlayerCount}</Label>
                    <Input
                      id="maxPlayerCount"
                      name="maxPlayerCount"
                      type="number"
                      min={0}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preferredLanguage">{dict.users.preferredLanguage}</Label>
                    <Input
                      id="preferredLanguage"
                      name="preferredLanguage"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="inviteCode">{dict.users.inviteCode}</Label>
                    <Input
                      id="inviteCode"
                      name="inviteCode"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="chosenUuid">{dict.users.chosenUuid}</Label>
                    <Input
                      id="chosenUuid"
                      name="chosenUuid"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? dict.common.loading : dict.common.create}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${lang}/admin/users`)}
            >
              {dict.common.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
