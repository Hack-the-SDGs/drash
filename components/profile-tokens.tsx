"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

interface ProfileTokensProps {
  apiToken?: string;
  minecraftToken?: string;
}

function TokenValue({ label, value }: { label: string; value: string }) {
  const dict = useDict();
  const [visible, setVisible] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(value);
    toast.success(dict.common.copiedToClipboard);
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <p className="min-w-0 flex-1 truncate font-mono text-xs">
          {visible ? value : "••••••••••••••••"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={copyToClipboard}
        >
          <CopyIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ProfileTokens({ apiToken, minecraftToken }: ProfileTokensProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {apiToken && <TokenValue label="API Token" value={apiToken} />}
          {minecraftToken && <TokenValue label="Minecraft Token" value={minecraftToken} />}
        </div>
      </CardContent>
    </Card>
  );
}
