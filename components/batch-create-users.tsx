"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import {
  batchCreateUsersAction,
  type BatchUserInput,
  type BatchResult,
} from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";

interface BatchCreateUsersProps {
  lang: string;
  isRoot: boolean;
}

interface RowData {
  id: number;
  username: string;
  password: string;
  maxPlayerCount: string;
  isAdmin: boolean;
  isLocked: boolean;
  preferredLanguage: string;
}

let nextId = 1;

function emptyRow(): RowData {
  return {
    id: nextId++,
    username: "",
    password: "",
    maxPlayerCount: "",
    isAdmin: false,
    isLocked: false,
    preferredLanguage: "",
  };
}

export function BatchCreateUsers({ lang, isRoot }: BatchCreateUsersProps) {
  const dict = useDict();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [rows, setRows] = useState<RowData[]>([emptyRow(), emptyRow()]);
  const [autoCreatePlayer, setAutoCreatePlayer] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [results, setResults] = useState<BatchResult[] | null>(null);

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: number, field: keyof RowData, value: string | boolean) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function parseCsv(text: string): BatchUserInput[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        const input: BatchUserInput = {
          username: parts[0],
          password: parts[1],
          createPlayer: autoCreatePlayer,
        };
        if (parts[2]) input.maxPlayerCount = parseInt(parts[2], 10);
        if (parts[3] === "true") input.isAdmin = true;
        if (parts[4] === "true") input.isLocked = true;
        if (parts[5]) input.preferredLanguage = parts[5];
        return input;
      })
      .filter((u) => u.username && u.password);
  }

  function getFormInputs(): BatchUserInput[] {
    return rows
      .filter((r) => r.username && r.password)
      .map((r) => {
        const input: BatchUserInput = {
          username: r.username,
          password: r.password,
          createPlayer: autoCreatePlayer,
        };
        if (r.maxPlayerCount) input.maxPlayerCount = parseInt(r.maxPlayerCount, 10);
        if (r.isAdmin) input.isAdmin = true;
        if (r.isLocked) input.isLocked = true;
        if (r.preferredLanguage) input.preferredLanguage = r.preferredLanguage;
        return input;
      });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) ?? "");
    };
    reader.readAsText(file);
  }

  function handleSubmit(inputs: BatchUserInput[]) {
    if (inputs.length === 0) return;
    setResults(null);

    startTransition(async () => {
      const res = await batchCreateUsersAction(inputs);
      setResults(res);
      const success = res.filter((r) => r.success).length;
      const failed = res.filter((r) => !r.success).length;
      if (failed === 0) {
        toast.success(
          dict.users.batchResult.replace("{success}", String(success)).replace("{failed}", "0"),
        );
      } else {
        toast.error(
          dict.users.batchResult.replace("{success}", String(success)).replace("{failed}", String(failed)),
        );
      }
    });
  }

  const formInputs = getFormInputs();
  const csvInputs = parseCsv(csvText);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <input
          id="autoCreatePlayer"
          type="checkbox"
          checked={autoCreatePlayer}
          onChange={(e) => setAutoCreatePlayer(e.target.checked)}
          className="size-4 rounded border"
        />
        <Label htmlFor="autoCreatePlayer">{dict.users.autoCreatePlayer}</Label>
      </div>

      <Tabs defaultValue="form">
        <TabsList>
          <TabsTrigger value="form">{dict.users.formMode}</TabsTrigger>
          <TabsTrigger value="import">{dict.users.importMode}</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.users.username} *</TableHead>
                  <TableHead>{dict.users.password} *</TableHead>
                  <TableHead>{dict.users.maxPlayerCount}</TableHead>
                  {isRoot && <TableHead>{dict.users.isAdmin}</TableHead>}
                  <TableHead>{dict.users.isLocked}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={row.username}
                        onChange={(e) => updateRow(row.id, "username", e.target.value)}
                        placeholder="username"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="password"
                        value={row.password}
                        onChange={(e) => updateRow(row.id, "password", e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={row.maxPlayerCount}
                        onChange={(e) => updateRow(row.id, "maxPlayerCount", e.target.value)}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    {isRoot && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={row.isAdmin}
                          onChange={(e) => updateRow(row.id, "isAdmin", e.target.checked)}
                          className="size-4 rounded border"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.isLocked}
                        onChange={(e) => updateRow(row.id, "isLocked", e.target.checked)}
                        className="size-4 rounded border"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addRow}>
              <PlusIcon className="size-4" data-icon="inline-start" />
              {dict.users.addRow}
            </Button>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {dict.users.willCreate.replace("{count}", String(formInputs.length))}
              </Badge>
              <Button
                onClick={() => handleSubmit(formInputs)}
                disabled={isPending || formInputs.length === 0}
              >
                {isPending ? (
                  <><Loader2Icon className="size-4 animate-spin" />{dict.common.loading}</>
                ) : (
                  dict.common.create
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <p className="text-sm text-muted-foreground">{dict.users.csvFormat}</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="min-h-[150px] w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
            placeholder={"alice,password123\nbob,password456,5\ncharlie,password789,1,true"}
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="csvFile" className="cursor-pointer">
              <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                <UploadIcon className="size-4" />
                {dict.users.uploadCsv}
              </div>
            </Label>
            <input
              id="csvFile"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {dict.users.willCreate.replace("{count}", String(csvInputs.length))}
            </Badge>
            <Button
              onClick={() => handleSubmit(csvInputs)}
              disabled={isPending || csvInputs.length === 0}
            >
              {isPending ? (
                <><Loader2Icon className="size-4 animate-spin" />{dict.common.loading}</>
              ) : (
                dict.common.create
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>
              {dict.users.batchResult
                .replace("{success}", String(results.filter((r) => r.success).length))
                .replace("{failed}", String(results.filter((r) => !r.success).length))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>{dict.users.username}</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.username}>
                      <TableCell>
                        {r.success ? (
                          <CheckCircleIcon className="size-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="size-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.error ?? "OK"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
