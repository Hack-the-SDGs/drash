"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updatePlayerAction } from "@/lib/actions/players";
import { SkinViewerComponent } from "@/components/skin-viewer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadIcon, Trash2Icon, SaveIcon } from "lucide-react";
import type { APIPlayer } from "@/lib/types";

type PlayerDict = {
  title: string;
  name: string;
  uuid: string;
  skin: string;
  cape: string;
  skinModel: string;
  classic: string;
  slim: string;
  uploadSkin: string;
  uploadCape: string;
  skinUrl: string;
  capeUrl: string;
  deleteSkin: string;
  deleteCape: string;
  skinSaved: string;
  capeSaved: string;
  saved: string;
  mojangTextures: string;
};

type CommonDict = {
  save: string;
  back: string;
};

interface SkinEditorProps {
  player: APIPlayer;
  dict: PlayerDict;
  commonDict: CommonDict;
  lang: string;
  readonly?: boolean;
}

type ActionState = { success: boolean; error?: string } | null;

export function SkinEditor({ player, dict, commonDict, lang, readonly }: SkinEditorProps) {
  const [skinModel, setSkinModel] = useState<"classic" | "slim">(player.skinModel);

  // Local preview URLs (from file upload, not yet saved)
  const [localSkinUrl, setLocalSkinUrl] = useState<string | null>(null);
  const [localCapeUrl, setLocalCapeUrl] = useState<string | null>(null);

  // URL input values
  const [skinUrlInput, setSkinUrlInput] = useState("");
  const [capeUrlInput, setCapeUrlInput] = useState("");

  // File refs
  const skinFileRef = useRef<HTMLInputElement>(null);
  const capeFileRef = useRef<HTMLInputElement>(null);

  // Bound action with player UUID
  const boundUpdateAction = async (_prev: ActionState, formData: FormData) => {
    return updatePlayerAction(player.uuid, formData);
  };

  const [skinState, skinFormAction, skinPending] = useActionState<ActionState, FormData>(
    boundUpdateAction,
    null,
  );

  const [capeState, capeFormAction, capePending] = useActionState<ActionState, FormData>(
    boundUpdateAction,
    null,
  );

  // Show toast on action completion
  useEffect(() => {
    if (skinState?.success) {
      toast.success(dict.saved);
      setLocalSkinUrl(null);
      setSkinUrlInput("");
      if (skinFileRef.current) skinFileRef.current.value = "";
    } else if (skinState?.error) {
      toast.error(skinState.error);
    }
  }, [skinState, dict.saved]);

  useEffect(() => {
    if (capeState?.success) {
      toast.success(dict.saved);
      setLocalCapeUrl(null);
      setCapeUrlInput("");
      if (capeFileRef.current) capeFileRef.current.value = "";
    } else if (capeState?.error) {
      toast.error(capeState.error);
    }
  }, [capeState, dict.saved]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (localSkinUrl) URL.revokeObjectURL(localSkinUrl);
      if (localCapeUrl) URL.revokeObjectURL(localCapeUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkinFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localSkinUrl) URL.revokeObjectURL(localSkinUrl);
    const url = URL.createObjectURL(file);
    setLocalSkinUrl(url);
    setSkinUrlInput("");
  };

  const handleCapeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localCapeUrl) URL.revokeObjectURL(localCapeUrl);
    const url = URL.createObjectURL(file);
    setLocalCapeUrl(url);
    setCapeUrlInput("");
  };

  // Determine what to show in the 3D preview
  const displaySkinUrl = localSkinUrl || (skinUrlInput ? skinUrlInput : player.skinUrl) || undefined;
  const displayCapeUrl = localCapeUrl || (capeUrlInput ? capeUrlInput : player.capeUrl) || undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{dict.title}</h1>
        <a href={`/${lang}/profile`}>
          <Button variant="outline" size="sm">
            {commonDict.back}
          </Button>
        </a>
      </div>

      {/* Player info */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{player.name}</span>
        <span className="mx-2">|</span>
        <span className="font-mono text-xs">{player.uuid}</span>
      </div>

      {/* Main content: 3D viewer + editor tabs */}
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        {/* 3D Viewer */}
        <Card className="w-fit">
          <CardContent className="flex items-center justify-center p-4">
            <SkinViewerComponent
              skinUrl={displaySkinUrl}
              capeUrl={displayCapeUrl}
              skinModel={skinModel}
              width={300}
              height={400}
            />
          </CardContent>
        </Card>

        {/* Editor tabs */}
        {readonly ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">{dict.mojangTextures}</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="skin">
            <TabsList>
              <TabsTrigger value="skin">{dict.skin}</TabsTrigger>
              <TabsTrigger value="cape">{dict.cape}</TabsTrigger>
            </TabsList>

            {/* Skin tab */}
            <TabsContent value="skin">
              <Card>
                <CardHeader>
                  <CardTitle>{dict.skin}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={skinFormAction} className="space-y-4">
                    {/* Skin model selector */}
                    <div className="space-y-1.5">
                      <Label>{dict.skinModel}</Label>
                      <Select
                        value={skinModel}
                        onValueChange={(v) => setSkinModel(v as "classic" | "slim")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">{dict.classic}</SelectItem>
                          <SelectItem value="slim">{dict.slim}</SelectItem>
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="skinModel" value={skinModel} />
                    </div>

                    {/* Upload skin file */}
                    <div className="space-y-1.5">
                      <Label htmlFor="skinFile">{dict.uploadSkin}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          ref={skinFileRef}
                          id="skinFile"
                          name="skinFile"
                          type="file"
                          accept="image/png"
                          onChange={handleSkinFileChange}
                        />
                        <UploadIcon className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    {/* OR: skin URL */}
                    <div className="space-y-1.5">
                      <Label htmlFor="skinUrl">{dict.skinUrl}</Label>
                      <Input
                        id="skinUrl"
                        name="skinUrl"
                        type="url"
                        placeholder="https://..."
                        value={skinUrlInput}
                        onChange={(e) => {
                          setSkinUrlInput(e.target.value);
                          if (e.target.value) {
                            setLocalSkinUrl(null);
                            if (skinFileRef.current) skinFileRef.current.value = "";
                          }
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button type="submit" disabled={skinPending}>
                        <SaveIcon className="size-4" />
                        {commonDict.save}
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={skinPending}
                        onClick={() => {
                          // Inject deleteSkin hidden field before submit
                          const form = skinFileRef.current?.closest("form");
                          if (form) {
                            const hidden = document.createElement("input");
                            hidden.type = "hidden";
                            hidden.name = "deleteSkin";
                            hidden.value = "true";
                            form.appendChild(hidden);
                          }
                        }}
                      >
                        <Trash2Icon className="size-4" />
                        {dict.deleteSkin}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cape tab */}
            <TabsContent value="cape">
              <Card>
                <CardHeader>
                  <CardTitle>{dict.cape}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={capeFormAction} className="space-y-4">
                    {/* Upload cape file */}
                    <div className="space-y-1.5">
                      <Label htmlFor="capeFile">{dict.uploadCape}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          ref={capeFileRef}
                          id="capeFile"
                          name="capeFile"
                          type="file"
                          accept="image/png"
                          onChange={handleCapeFileChange}
                        />
                        <UploadIcon className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    {/* OR: cape URL */}
                    <div className="space-y-1.5">
                      <Label htmlFor="capeUrl">{dict.capeUrl}</Label>
                      <Input
                        id="capeUrl"
                        name="capeUrl"
                        type="url"
                        placeholder="https://..."
                        value={capeUrlInput}
                        onChange={(e) => {
                          setCapeUrlInput(e.target.value);
                          if (e.target.value) {
                            setLocalCapeUrl(null);
                            if (capeFileRef.current) capeFileRef.current.value = "";
                          }
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button type="submit" disabled={capePending}>
                        <SaveIcon className="size-4" />
                        {commonDict.save}
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={capePending}
                        onClick={() => {
                          const form = capeFileRef.current?.closest("form");
                          if (form) {
                            const hidden = document.createElement("input");
                            hidden.type = "hidden";
                            hidden.name = "deleteCape";
                            hidden.value = "true";
                            form.appendChild(hidden);
                          }
                        }}
                      >
                        <Trash2Icon className="size-4" />
                        {dict.deleteCape}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
