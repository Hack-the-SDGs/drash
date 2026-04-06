# User & Player Management Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 enhancements to the Drash admin dashboard covering permissions, UI sorting, Mojang integration, staff capabilities, and batch user creation.

**Architecture:** Three-phase approach: (1) shared infrastructure (permissions, sorting hook, Mojang API), (2) shared components (i18n, create-player-dialog), (3) feature implementations across existing pages. All phases designed for multi-agent parallel execution with non-overlapping file ownership per task.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, shadcn/ui, Tailwind CSS, Drasl API v2, Mojang API

**Spec:** `docs/superpowers/specs/2026-04-06-user-player-enhancements-design.md`

---

## Phase 1: Foundation (3 parallel agents — no file conflicts)

### Task 1: Permission Utility

**Files:**
- Create: `lib/permissions.ts`

- [ ] **Step 1: Create `lib/permissions.ts`**

```typescript
import type { APIPlayer, APIUser, Role } from "@/lib/types";

/**
 * Whether the viewer can delete a specific player.
 *
 * Rules:
 * - If player name !== owner username → anyone with permission can delete
 * - If player name === owner username (same-name player):
 *   - Admin can delete a "user"-role owner's same-name player
 *   - Root can delete an "admin" or "user"-role owner's same-name player
 *   - Nobody can delete their OWN same-name player
 */
export function canDeletePlayer(
  viewerRole: Role,
  viewerUsername: string,
  playerName: string,
  ownerUsername: string,
  ownerRole: Role,
): boolean {
  const isSameNamePlayer = playerName === ownerUsername;
  if (!isSameNamePlayer) return true;

  // Same-name player: need higher role than owner, and cannot be self
  const isSelf = viewerUsername === ownerUsername;
  if (isSelf) return false;

  if (viewerRole === "root") return true;
  if (viewerRole === "admin" && ownerRole === "user") return true;
  return false;
}

/**
 * Whether the viewer can lock/unlock the target user.
 *
 * Rules:
 * - Admin cannot lock admin or root
 * - Root can lock everyone except self
 */
export function canLockUser(
  viewerRole: Role,
  targetRole: Role,
  isSelf: boolean,
): boolean {
  if (isSelf) return false;
  if (viewerRole === "root") return true;
  if (viewerRole === "admin" && targetRole === "user") return true;
  return false;
}

/** Player textures come from Mojang and cannot be modified. */
export function isMojangPlayer(player: APIPlayer): boolean {
  return !!player.fallbackPlayer;
}

/** User is a "staff" member who can manage their own players. */
export function isStaff(user: APIUser): boolean {
  return user.maxPlayerCount > 1;
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`
Expected: Build succeeds (new file has no consumers yet, just needs to compile)

- [ ] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat(permissions): add centralized permission utility functions

- canDeletePlayer: same-name player protection with role hierarchy
- canLockUser: role-based lock restrictions
- isMojangPlayer: detect Mojang-linked players
- isStaff: detect staff users (maxPlayerCount > 1)"
```

---

### Task 2: Sortable Table Hook

**Files:**
- Create: `hooks/use-sortable.ts`

- [ ] **Step 1: Create `hooks/use-sortable.ts`**

```typescript
"use client";

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig<T> {
  defaultKey: string;
  defaultDirection: SortDirection;
  sortFns: Record<string, (a: T, b: T) => number>;
}

export interface SortState {
  sortKey: string;
  direction: SortDirection;
}

export function useSortable<T>(items: T[], config: SortConfig<T>) {
  const [state, setState] = useState<SortState>({
    sortKey: config.defaultKey,
    direction: config.defaultDirection,
  });

  const sorted = useMemo(() => {
    const fn = config.sortFns[state.sortKey];
    if (!fn) return items;
    const result = [...items].sort(fn);
    return state.direction === "desc" ? result.reverse() : result;
  }, [items, state.sortKey, state.direction, config.sortFns]);

  function toggleSort(key: string) {
    setState((prev) => {
      if (prev.sortKey === key) {
        return { ...prev, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { sortKey: key, direction: "asc" };
    });
  }

  return { sorted, sortKey: state.sortKey, direction: state.direction, toggleSort };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add hooks/use-sortable.ts
git commit -m "feat(hooks): add generic useSortable hook for table sorting

- Supports multiple sort keys with custom comparator functions
- Toggles asc/desc on repeated clicks
- Memoized sorting for performance"
```

---

### Task 3: Mojang API Client

**Files:**
- Create: `lib/mojang.ts`

- [ ] **Step 1: Create `lib/mojang.ts`**

```typescript
"use server";

interface MojangProfile {
  id: string;
  name: string;
}

/** Look up a Minecraft player UUID from Mojang by username. */
export async function lookupMojangUuid(
  username: string,
): Promise<{ uuid: string; name: string } | null> {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      { cache: "no-store" },
    );
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) return null;

    const data: MojangProfile = await res.json();
    // Mojang returns UUID without dashes — insert them
    const uuid = data.id.replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5",
    );
    return { uuid, name: data.name };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add lib/mojang.ts
git commit -m "feat(mojang): add Mojang API client for UUID lookup

- Server action to look up Minecraft UUID by username
- Handles 404/204 responses gracefully
- Formats UUID with dashes"
```

---

## Phase 2: Shared Components (after Phase 1 merge — 2 parallel agents)

### Task 4: i18n Keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh-TW.json`

- [ ] **Step 1: Add all new i18n keys to `messages/en.json`**

Add the following keys to the existing JSON structure. Read the file first, then merge these new keys into the appropriate sections:

In `common`, add:
```json
"sortAsc": "Sort ascending",
"sortDesc": "Sort descending",
"sort": "Sort"
```

In `profile`, add:
```json
"playerLimit": "Player Limit",
"unlimited": "Unlimited",
"changePassword": "Change Password",
"newPassword": "New Password",
"createPlayer": "Create Player",
"deletePlayer": "Delete Player",
"deletePlayerConfirm": "Are you sure you want to delete this player?",
"staffDescription": "Manage your account and players",
"playerCount": "{current} / {max}"
```

In `player`, add:
```json
"createPlayer": "Create Player",
"mojangTextures": "Textures are managed by Mojang and cannot be modified here",
"newPlayer": "New Player",
"existingPlayerMode": "Existing Player",
"lookupMojang": "Look up",
"mojangUsername": "Minecraft Username",
"orEnterUuid": "Or enter UUID directly",
"mojangNotFound": "Player not found on Mojang",
"mojangFound": "Found: {name}",
"selectOwner": "Select Owner"
```

In `users`, add:
```json
"batchCreate": "Batch Create",
"batchCreateTitle": "Batch Create Users",
"formMode": "Form Mode",
"importMode": "Import Mode",
"autoCreatePlayer": "Auto-create same-name player for each user",
"addRow": "Add Row",
"csvFormat": "CSV format: username,password[,maxPlayerCount,isAdmin,isLocked,preferredLanguage]",
"uploadCsv": "Upload CSV",
"preview": "Preview",
"willCreate": "Will create {count} users",
"creating": "Creating... {current}/{total}",
"batchResult": "{success} succeeded, {failed} failed",
"retryFailed": "Retry Failed",
"cannotLockHigherRole": "Cannot lock users of equal or higher role",
"cannotDeleteSameNamePlayer": "Cannot delete the player with the same name as the user"
```

- [ ] **Step 2: Add all new i18n keys to `messages/zh-TW.json`**

Same structure, with Chinese translations:

In `common`, add:
```json
"sortAsc": "升冪排序",
"sortDesc": "降冪排序",
"sort": "排序"
```

In `profile`, add:
```json
"playerLimit": "玩家上限",
"unlimited": "無限制",
"changePassword": "修改密碼",
"newPassword": "新密碼",
"createPlayer": "建立玩家",
"deletePlayer": "刪除玩家",
"deletePlayerConfirm": "確定要刪除此玩家嗎？",
"staffDescription": "管理你的帳號與玩家",
"playerCount": "{current} / {max}"
```

In `player`, add:
```json
"createPlayer": "建立玩家",
"mojangTextures": "材質由 Mojang 管理，無法在此修改",
"newPlayer": "新玩家",
"existingPlayerMode": "現有玩家",
"lookupMojang": "查詢",
"mojangUsername": "Minecraft 使用者名稱",
"orEnterUuid": "或直接輸入 UUID",
"mojangNotFound": "在 Mojang 找不到此玩家",
"mojangFound": "找到：{name}",
"selectOwner": "選擇所屬使用者"
```

In `users`, add:
```json
"batchCreate": "批量建立",
"batchCreateTitle": "批量建立使用者",
"formMode": "表單模式",
"importMode": "匯入模式",
"autoCreatePlayer": "自動為每位使用者建立同名玩家",
"addRow": "新增一行",
"csvFormat": "CSV 格式：username,password[,maxPlayerCount,isAdmin,isLocked,preferredLanguage]",
"uploadCsv": "上傳 CSV",
"preview": "預覽",
"willCreate": "將建立 {count} 位使用者",
"creating": "建立中... {current}/{total}",
"batchResult": "成功 {success} 筆，失敗 {failed} 筆",
"retryFailed": "重試失敗項目",
"cannotLockHigherRole": "無法鎖定同級或更高權限的使用者",
"cannotDeleteSameNamePlayer": "無法刪除與使用者同名的玩家"
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/zh-TW.json
git commit -m "feat(i18n): add translation keys for all new features

- Sorting, permissions, staff profile, Mojang integration
- Batch user creation, player creation dialog
- Both en and zh-TW translations"
```

---

### Task 5: Shared Player Creation Dialog

**Files:**
- Create: `components/create-player-dialog.tsx`

**Dependencies:** Task 3 (lib/mojang.ts) must be merged first.

- [ ] **Step 1: Create `components/create-player-dialog.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { createPlayerAction } from "@/lib/actions/players";
import { lookupMojangUuid } from "@/lib/mojang";
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
import { SearchIcon, Loader2Icon } from "lucide-react";
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

  // Mojang lookup state
  const [mojangUsername, setMojangUsername] = useState("");
  const [mojangResult, setMojangResult] = useState<{
    uuid: string;
    name: string;
  } | null>(null);
  const [mojangError, setMojangError] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [directUuid, setDirectUuid] = useState("");

  function resetState() {
    setMode("new");
    setSkinModel("classic");
    setMojangUsername("");
    setMojangResult(null);
    setMojangError(false);
    setDirectUuid("");
    setSelectedUserUuid(userUuid ?? "");
  }

  async function handleMojangLookup() {
    if (!mojangUsername.trim()) return;
    setIsLookingUp(true);
    setMojangError(false);
    setMojangResult(null);
    const result = await lookupMojangUuid(mojangUsername.trim());
    if (result) {
      setMojangResult(result);
      setDirectUuid(result.uuid);
    } else {
      setMojangError(true);
    }
    setIsLookingUp(false);
  }

  function handleSubmit(formData: FormData) {
    const ownerUuid = userUuid ?? selectedUserUuid;
    if (ownerUuid) formData.set("userUuid", ownerUuid);
    if (skinModel) formData.set("skinModel", skinModel);

    if (mode === "existing") {
      const uuid = directUuid || mojangResult?.uuid;
      if (uuid) {
        formData.set("chosenUuid", uuid);
        formData.set("existingPlayer", "true");
      }
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
                onValueChange={setSelectedUserUuid}
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

          {/* Player name */}
          <div className="space-y-1.5">
            <Label htmlFor="create-player-name">{dict.player.name}</Label>
            <Input id="create-player-name" name="name" required />
          </div>

          {mode === "new" ? (
            <>
              {/* Skin model */}
              <div className="space-y-1.5">
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
            <>
              {/* Mojang username lookup */}
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
                    {isLookingUp ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <SearchIcon className="size-4" />
                    )}
                    {dict.player.lookupMojang}
                  </Button>
                </div>
                {mojangResult && (
                  <p className="text-sm text-green-600">
                    {dict.player.mojangFound.replace("{name}", mojangResult.name)}
                    <span className="ml-1 font-mono text-xs text-muted-foreground">
                      {mojangResult.uuid}
                    </span>
                  </p>
                )}
                {mojangError && (
                  <p className="text-sm text-destructive">
                    {dict.player.mojangNotFound}
                  </p>
                )}
              </div>

              {/* Direct UUID input */}
              <div className="space-y-1.5">
                <Label>{dict.player.orEnterUuid}</Label>
                <Input
                  value={directUuid}
                  onChange={(e) => setDirectUuid(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
            </>
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
                (needsOwnerSelection && !selectedUserUuid)
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
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add components/create-player-dialog.tsx
git commit -m "feat(components): add shared CreatePlayerDialog component

- New/existing player mode toggle
- Mojang username lookup with UUID resolution
- Direct UUID input for existing players
- Owner selection when opened from players page
- Staff mode for self-service player creation"
```

---

## Phase 3: Features (8 parallel agents — each touches different files)

### Task 6: UserTable — Sorting + Lock Restrictions

**Files:**
- Modify: `components/user-table.tsx`
- Modify: `app/[lang]/(admin)/admin/users/page.tsx`

**Dependencies:** Task 1 (permissions.ts), Task 2 (use-sortable.ts), Task 4 (i18n)

- [ ] **Step 1: Update `app/[lang]/(admin)/admin/users/page.tsx` to pass session role**

Read the file first. Compute user roles server-side and pass to `UserTable`:

```tsx
// Add to imports:
import { getSession, getRole } from "@/lib/drasl/auth";
import type { Role } from "@/lib/types";

// After fetching users, compute roles:
const userRoles: Record<string, Role> = {};
for (const user of users) {
  userRoles[user.uuid] = getRole(user);
}

// Change the return to pass viewerRole and userRoles:
<UserTable users={users} lang={lang} currentUserUuid={session.uuid} viewerRole={session.role} userRoles={userRoles} />
```

- [ ] **Step 2: Rewrite `components/user-table.tsx` with sorting and lock restrictions**

Read the existing file first. Make these changes:

1. Add imports:
```typescript
import { useSortable } from "@/hooks/use-sortable";
import { canLockUser } from "@/lib/permissions";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import type { Role } from "@/lib/types";
```

2. Add `viewerRole: Role` and `userRoles: Record<string, Role>` to the `UserTableProps` interface and component params. (`getRole()` uses server-only env vars, so roles must be computed server-side and passed as props.)

3. After the `search` filter, add sorting with `useSortable`:
```typescript
const { sorted, sortKey, direction, toggleSort } = useSortable(filtered, {
  defaultKey: "adminFirst",
  defaultDirection: "asc",
  sortFns: {
    adminFirst: (a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return a.username.localeCompare(b.username);
    },
    username: (a, b) => a.username.localeCompare(b.username),
    locked: (a, b) => {
      if (a.isLocked !== b.isLocked) return a.isLocked ? -1 : 1;
      return a.username.localeCompare(b.username);
    },
    playerCount: (a, b) => (a.players?.length ?? 0) - (b.players?.length ?? 0),
  },
});
```

4. Replace `filtered.map(...)` with `sorted.map(...)` in the table body.

5. Replace static `<TableHead>` elements with sortable headers. For each sortable column, render a clickable button:
```tsx
<TableHead>
  <button
    className="flex items-center gap-1 hover:text-foreground"
    onClick={() => toggleSort("username")}
  >
    {dict.users.username}
    {sortKey === "username" && (direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
  </button>
</TableHead>
```

Apply the same pattern for Admin (key: `adminFirst`), Locked (key: `locked`), Players (key: `playerCount`).

6. For the lock/unlock dropdown item, add permission check using the server-computed `userRoles` map:
```typescript
const targetRole = userRoles[user.uuid] ?? "user";
const canLock = canLockUser(viewerRole, targetRole, isSelf);
```
Use `canLock` to set `disabled` on the lock/unlock menu item. When disabled, show tooltip `dict.users.cannotLockHigherRole`.

7. Add batch create button next to create user button:
```tsx
<Button
  size="sm"
  variant="outline"
  nativeButton={false}
  render={<Link href={`/${lang}/admin/users/batch`} />}
>
  <PlusIcon className="size-4" data-icon="inline-start" />
  {dict.users.batchCreate}
</Button>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add components/user-table.tsx app/\[lang\]/\(admin\)/admin/users/page.tsx
git commit -m "feat(user-table): add sorting and lock restrictions

- Sortable columns: username, admin, locked, player count
- Default sort: admin first then A-Z
- Lock/unlock respects role hierarchy via canLockUser()
- Add batch create button"
```

---

### Task 7: PlayerTable — Sorting + Create Player Button

**Files:**
- Modify: `components/player-table.tsx`
- Modify: `app/[lang]/(admin)/admin/players/page.tsx`

**Dependencies:** Task 2 (use-sortable.ts), Task 4 (i18n), Task 5 (create-player-dialog.tsx)

- [ ] **Step 1: Update `app/[lang]/(admin)/admin/players/page.tsx` to pass `users` array**

Read the file first. The page already fetches `users`. Pass the full `users` array to `PlayerTable`:

```tsx
<PlayerTable players={playersWithTextures} userMap={userMap} users={users} lang={lang} />
```

- [ ] **Step 2: Update `components/player-table.tsx` with sorting and create button**

Read the existing file first. Make these changes:

1. Add imports:
```typescript
import { useSortable } from "@/hooks/use-sortable";
import { CreatePlayerDialog } from "@/components/create-player-dialog";
import { PlusIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import type { APIUser } from "@/lib/types";
```

2. Add `users: APIUser[]` to `PlayerTableProps` interface.

3. Add state for dialog: `const [createOpen, setCreateOpen] = useState(false);`

4. After the search filter, add sorting:
```typescript
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
```

5. Replace `filtered.map(...)` with `sorted.map(...)`.

6. Add sortable column headers (same pattern as Task 6).

7. Add create player button next to search:
```tsx
<Button size="sm" onClick={() => setCreateOpen(true)}>
  <PlusIcon className="size-4" data-icon="inline-start" />
  {dict.player.createPlayer}
</Button>
```

8. Add dialog at end of component:
```tsx
<CreatePlayerDialog
  open={createOpen}
  onOpenChange={setCreateOpen}
  users={users}
/>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add components/player-table.tsx app/\[lang\]/\(admin\)/admin/players/page.tsx
git commit -m "feat(player-table): add sorting and create player button

- Sortable columns: name, owner, skin model, created date
- Create player dialog with owner selection
- Default sort: name A-Z"
```

---

### Task 8: EditUserForm — Player Delete + Lock Restrictions + Use CreatePlayerDialog

**Files:**
- Modify: `components/edit-user-form.tsx`

**Dependencies:** Task 1 (permissions.ts), Task 4 (i18n), Task 5 (create-player-dialog.tsx)

- [ ] **Step 1: Update `components/edit-user-form.tsx`**

Read the existing file first. Make these changes:

1. Add imports:
```typescript
import { canDeletePlayer, canLockUser } from "@/lib/permissions";
import { deletePlayerAction } from "@/lib/actions/players";
import { CreatePlayerDialog } from "@/components/create-player-dialog";
```

2. Add `viewerUsername: string` and `targetRole: Role` to `EditUserFormProps`. The server page will compute `targetRole` via `getRole(user)` and pass it in.

3. Add state for player deletion and CreatePlayerDialog:
```typescript
const [deletePlayerTarget, setDeletePlayerTarget] = useState<{ uuid: string; name: string } | null>(null);
```

3. Add player delete handler:
```typescript
function handleDeletePlayer() {
  if (!deletePlayerTarget) return;
  startTransition(async () => {
    const result = await deletePlayerAction(deletePlayerTarget.uuid);
    if (result.success) {
      toast.success(dict.player.deleted);
    } else {
      toast.error(result.error ?? dict.errors.unknown);
    }
    setDeletePlayerTarget(null);
  });
}
```

4. In the Players card, for each player item, add a delete button with permission check:
```typescript
// Inside the player.map (targetRole is passed from server via props):
const canDelete = canDeletePlayer(viewerRole, viewerUsername, player.name, user.username, targetRole);
```

Replace the existing player list rendering with:
```tsx
{user.players.map((player) => {
  const canDelete = canDeletePlayer(
    viewerRole,
    /* viewerUsername needs to be passed as prop or derived */
    viewerUsername,
    player.name,
    user.username,
    userRole,
  );
  return (
    <div key={player.uuid} className="flex items-center justify-between rounded-md border px-3 py-2">
      <div>
        <span className="font-medium">{player.name}</span>
        <span className="ml-2 text-xs text-muted-foreground font-mono">{player.uuid}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" nativeButton={false}
          render={<Link href={`/${lang}/admin/players/${player.uuid}`} />}>
          {dict.common.edit}
        </Button>
        <Button
          variant="ghost" size="icon-sm"
          onClick={() => setDeletePlayerTarget({ uuid: player.uuid, name: player.name })}
          disabled={!canDelete || isPending}
          title={!canDelete ? dict.users.cannotDeleteSameNamePlayer : undefined}
        >
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
})}
```

5. For lock/unlock button in the Status card, add permission check using `targetRole` (already a prop):
```typescript
const canLock = canLockUser(viewerRole, targetRole, false);
```
Disable the lock/unlock button when `!canLock` and show tooltip.

7. Replace the inline "Add Player" Dialog with `CreatePlayerDialog`:
```tsx
<CreatePlayerDialog
  open={addPlayerOpen}
  onOpenChange={setAddPlayerOpen}
  userUuid={user.uuid}
/>
```
Remove the old inline Dialog JSX for add player.

8. Add ConfirmDialog for player deletion:
```tsx
<ConfirmDialog
  open={deletePlayerTarget !== null}
  onOpenChange={(open) => { if (!open) setDeletePlayerTarget(null); }}
  title={dict.profile.deletePlayer}
  description={dict.profile.deletePlayerConfirm}
  confirmLabel={dict.common.delete}
  destructive
  onConfirm={handleDeletePlayer}
  pending={isPending}
/>
```

- [ ] **Step 2: Update `app/[lang]/(admin)/admin/users/[uuid]/page.tsx` to pass new props**

```tsx
import { getRole } from "@/lib/drasl/auth";

// After fetching user:
const targetRole = getRole(user);

// Update component invocation:
<EditUserForm user={user} lang={lang} viewerRole={session.role} viewerUsername={session.username} targetRole={targetRole} />
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add components/edit-user-form.tsx app/\[lang\]/\(admin\)/admin/users/\[uuid\]/page.tsx
git commit -m "feat(edit-user-form): add player delete, lock restrictions, shared dialog

- Player delete buttons with canDeletePlayer permission check
- Same-name player protection with tooltip
- Lock/unlock respects role hierarchy
- Replace inline add-player dialog with CreatePlayerDialog"
```

---

### Task 9: AdminManager + InviteManager — Sorting

**Files:**
- Modify: `components/admin-manager.tsx`
- Modify: `components/invite-manager.tsx`

**Dependencies:** Task 2 (use-sortable.ts), Task 4 (i18n)

- [ ] **Step 1: Update `components/admin-manager.tsx` with sorting**

Read the existing file first. Add:

1. Import `useSortable` and arrow icons:
```typescript
import { useSortable } from "@/hooks/use-sortable";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
```

2. Add sorting after the users array:
```typescript
const { sorted, sortKey, direction, toggleSort } = useSortable(users, {
  defaultKey: "adminFirst",
  defaultDirection: "asc",
  sortFns: {
    adminFirst: (a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return a.username.localeCompare(b.username);
    },
    username: (a, b) => a.username.localeCompare(b.username),
  },
});
```

3. Replace `users.map(...)` with `sorted.map(...)`.

4. Add sortable column headers with arrow indicators.

- [ ] **Step 2: Update `components/invite-manager.tsx` with sorting**

Read the existing file first. Add:

1. Import `useSortable` and arrow icons.

2. Add sorting:
```typescript
const { sorted, sortKey, direction, toggleSort } = useSortable(invites, {
  defaultKey: "createdAt",
  defaultDirection: "desc",
  sortFns: {
    code: (a, b) => a.code.localeCompare(b.code),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
});
```

3. Replace `invites.map(...)` with `sorted.map(...)`.

4. Add sortable column headers.

- [ ] **Step 3: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add components/admin-manager.tsx components/invite-manager.tsx
git commit -m "feat(tables): add sorting to admin manager and invite manager

- Admin manager: sort by admin-first or username
- Invite manager: sort by code or creation date (newest first default)"
```

---

### Task 10: Mojang Skin Hiding

**Files:**
- Modify: `components/skin-editor.tsx`
- Modify: `components/admin-player-editor.tsx`
- Modify: `app/[lang]/(admin)/admin/players/[uuid]/page.tsx`

**Dependencies:** Task 1 (permissions.ts), Task 4 (i18n)

- [ ] **Step 1: Add `readonly` prop to `components/skin-editor.tsx`**

Read the existing file first. Make these changes:

1. Add `readonly?: boolean` to `SkinEditorProps`.

2. In the component, if `readonly` is true, replace the editor tabs content with a read-only message:

After the 3D viewer card, conditionally render:
```tsx
{readonly ? (
  <Card>
    <CardContent className="flex items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">{dict.mojangTextures}</p>
    </CardContent>
  </Card>
) : (
  <Tabs defaultValue="skin">
    {/* ... existing tab content ... */}
  </Tabs>
)}
```

3. Add `mojangTextures` to the `PlayerDict` type:
```typescript
mojangTextures: string;
```

- [ ] **Step 2: Update `components/admin-player-editor.tsx` to pass `readonly`**

Read the existing file first. Add:

1. Import: `import { isMojangPlayer } from "@/lib/permissions";`

2. Before the return, compute: `const mojang = isMojangPlayer(player);`

3. Pass to SkinEditor: `<SkinEditor player={player} dict={dict.player} commonDict={dict.common} lang={lang} readonly={mojang} />`

- [ ] **Step 3: Update `app/[lang]/(admin)/admin/players/[uuid]/page.tsx`**

No changes needed — the dict already passes through correctly. Just verify the `player.mojangTextures` key is in the dict (added in Task 4).

- [ ] **Step 4: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add components/skin-editor.tsx components/admin-player-editor.tsx
git commit -m "feat(skin-editor): hide controls for Mojang-linked players

- Add readonly prop to SkinEditor
- Show info message instead of upload/delete controls
- AdminPlayerEditor detects Mojang players via isMojangPlayer()"
```

---

### Task 11: Profile Page Enhancements

**Files:**
- Modify: `app/[lang]/(user)/profile/page.tsx`

**Dependencies:** Task 1 (permissions.ts), Task 4 (i18n), Task 5 (create-player-dialog.tsx)

- [ ] **Step 1: Create a client component for staff profile actions**

Since the profile page is a server component and staff features need interactivity, create a client component wrapper. Add this as a new section in the profile page or create a separate component.

The simplest approach: convert the player card section to a client component. Create `components/profile-players.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { deletePlayerAction } from "@/lib/actions/players";
import { updateUserAction } from "@/lib/actions/users";
import { canDeletePlayer, isMojangPlayer } from "@/lib/permissions";
import { CreatePlayerDialog } from "@/components/create-player-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlayerHead } from "@/components/player-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import type { APIPlayer, Role } from "@/lib/types";

interface ProfilePlayersProps {
  players: (APIPlayer & { skinUrl: string; capeUrl: string })[];
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
          {isStaff && (
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
              const canDelete = isStaff && canDeletePlayer(
                userRole, username, player.name, username, userRole,
              );
              const mojang = isMojangPlayer(player);

              return (
                <Card key={player.uuid}>
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
                    <div className="flex flex-col gap-1">
                      {!mojang && (
                        <Link href={`/${lang}/players/${player.uuid}`}>
                          <Button variant="ghost" size="icon-sm">
                            <PencilIcon className="size-4" />
                          </Button>
                        </Link>
                      )}
                      {isStaff && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget({ uuid: player.uuid, name: player.name })}
                          disabled={!canDelete || isPending}
                          title={!canDelete ? dict.users.cannotDeleteSameNamePlayer : undefined}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {isStaff && (
        <>
          <CreatePlayerDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            userUuid={userUuid}
            isStaffMode
          />
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
```

Also create `components/profile-password.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useDict } from "@/components/dict-provider";
import { updateUserAction } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfilePasswordProps {
  userUuid: string;
}

export function ProfilePassword({ userUuid }: ProfilePasswordProps) {
  const dict = useDict();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateUserAction(userUuid, formData);
      if (result.success) {
        toast.success(dict.users.updated);
      } else {
        toast.error(result.error ?? dict.errors.unknown);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.profile.changePassword}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="profile-password">{dict.profile.newPassword}</Label>
            <Input id="profile-password" name="password" type="password" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? dict.common.loading : dict.common.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update `app/[lang]/(user)/profile/page.tsx`**

Read the existing file first. Replace the My Players section and add new sections:

1. Add imports:
```typescript
import { isStaff as checkIsStaff } from "@/lib/permissions";
import { ProfilePlayers } from "@/components/profile-players";
import { ProfilePassword } from "@/components/profile-password";
```

2. After computing `role`, add:
```typescript
const staff = checkIsStaff(user);
```

3. In the user info card grid, add a player limit item:
```tsx
<div>
  <p className="text-xs text-muted-foreground">{dict.profile.playerLimit}</p>
  <p className="text-sm font-medium">
    {user.maxPlayerCount === -1
      ? dict.profile.unlimited
      : dict.profile.playerCount
          .replace("{current}", String(user.players.length))
          .replace("{max}", String(user.maxPlayerCount))}
  </p>
</div>
```

4. After the user info card, conditionally show password change:
```tsx
{staff && <ProfilePassword userUuid={user.uuid} />}
```

5. Replace the entire "My Players section" `<div className="space-y-4">...</div>` with:
```tsx
<ProfilePlayers
  players={playersWithTextures}
  userUuid={user.uuid}
  username={user.username}
  userRole={role}
  maxPlayerCount={user.maxPlayerCount}
  isStaff={staff}
  lang={lang}
/>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add components/profile-players.tsx components/profile-password.tsx app/\[lang\]/\(user\)/profile/page.tsx
git commit -m "feat(profile): add staff features and player limit display

- Staff users (maxPlayerCount > 1) can change password, create/delete players
- Same-name player protection on delete
- Mojang players hide edit skin link
- Player limit shown as current/max in info card"
```

---

### Task 12: CreateUserForm — Mojang Lookup for Existing Player

**Files:**
- Modify: `components/create-user-form.tsx`

**Dependencies:** Task 3 (lib/mojang.ts), Task 4 (i18n)

- [ ] **Step 1: Update `components/create-user-form.tsx`**

Read the existing file first. Make these changes:

1. Add imports:
```typescript
import { lookupMojangUuid } from "@/lib/mojang";
import { SearchIcon, Loader2Icon } from "lucide-react";
```

2. Add state for Mojang lookup:
```typescript
const [existingPlayerChecked, setExistingPlayerChecked] = useState(false);
const [mojangUsername, setMojangUsername] = useState("");
const [mojangResult, setMojangResult] = useState<{ uuid: string; name: string } | null>(null);
const [mojangError, setMojangError] = useState(false);
const [isLookingUp, setIsLookingUp] = useState(false);
```

3. Add lookup handler:
```typescript
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
```

4. In the Advanced section, find the "existingPlayer" checkbox. Replace the checkbox with a controlled one:
```tsx
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
```

5. When `existingPlayerChecked` is true, show Mojang lookup fields below the advanced section checkboxes (still inside the advanced panel):
```tsx
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
```

6. In `handleSubmit`, if `mojangResult` is set and `existingPlayerChecked`, set the chosenUuid:
```typescript
function handleSubmit(formData: FormData) {
  if (skinModel) formData.set("skinModel", skinModel);
  if (existingPlayerChecked && mojangResult) {
    formData.set("chosenUuid", mojangResult.uuid);
  }
  // ... rest unchanged
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add components/create-user-form.tsx
git commit -m "feat(create-user): add Mojang username lookup for existing player

- When 'Existing Player' is checked, show Mojang lookup field
- Search by Minecraft username to resolve UUID
- Auto-fills chosenUuid with resolved Mojang UUID"
```

---

### Task 13: Batch User Creation

**Files:**
- Create: `components/batch-create-users.tsx`
- Create: `app/[lang]/(admin)/admin/users/batch/page.tsx`
- Modify: `lib/actions/users.ts`

**Dependencies:** Task 4 (i18n)

- [ ] **Step 1: Add batch action to `lib/actions/users.ts`**

Read the existing file first. Add at the bottom:

```typescript
export interface BatchUserInput {
  username: string;
  password: string;
  maxPlayerCount?: number;
  isAdmin?: boolean;
  isLocked?: boolean;
  preferredLanguage?: string;
  createPlayer?: boolean;
}

export interface BatchResult {
  username: string;
  success: boolean;
  error?: string;
}

export async function batchCreateUsersAction(
  users: BatchUserInput[],
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (const input of users) {
    const data: APICreateUserRequest = {
      username: input.username,
      password: input.password,
    };
    if (input.maxPlayerCount !== undefined) data.maxPlayerCount = input.maxPlayerCount;
    if (input.isAdmin) data.isAdmin = true;
    if (input.isLocked) data.isLocked = true;
    if (input.preferredLanguage) data.preferredLanguage = input.preferredLanguage;
    if (input.createPlayer) data.playerName = input.username;

    try {
      await createUser(data);
      results.push({ username: input.username, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ username: input.username, success: false, error: message });
    }
  }

  updateTag("users");
  updateTag("players");
  return results;
}
```

- [ ] **Step 2: Create `components/batch-create-users.tsx`**

```typescript
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

  // Form mode state
  const [rows, setRows] = useState<RowData[]>([emptyRow(), emptyRow()]);
  const [autoCreatePlayer, setAutoCreatePlayer] = useState(true);

  // Import mode state
  const [csvText, setCsvText] = useState("");

  // Results
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

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
    setProgress({ current: 0, total: inputs.length });

    startTransition(async () => {
      const res = await batchCreateUsersAction(inputs);
      setResults(res);
      setProgress(null);
      const success = res.filter((r) => r.success).length;
      const failed = res.filter((r) => !r.success).length;
      if (failed === 0) {
        toast.success(
          dict.users.batchResult
            .replace("{success}", String(success))
            .replace("{failed}", "0"),
        );
      } else {
        toast.error(
          dict.users.batchResult
            .replace("{success}", String(success))
            .replace("{failed}", String(failed)),
        );
      }
    });
  }

  const formInputs = getFormInputs();
  const csvInputs = parseCsv(csvText);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Auto-create player toggle */}
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

        {/* Form Mode */}
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
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    {dict.common.loading}
                  </>
                ) : (
                  dict.common.create
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Import Mode */}
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
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {dict.common.loading}
                </>
              ) : (
                dict.common.create
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
```

- [ ] **Step 3: Create `app/[lang]/(admin)/admin/users/batch/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { BatchCreateUsers } from "@/components/batch-create-users";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default async function BatchCreateUsersPage(
  props: PageProps<"/[lang]/admin/users/batch">,
) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);

  const dict = await getDictionary(lang as Locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/${lang}/admin/users`} />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {dict.users.batchCreateTitle}
        </h1>
      </div>
      <BatchCreateUsers lang={lang} isRoot={session.role === "root"} />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/xinshou/IdeaProjects/drash && npx next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add lib/actions/users.ts components/batch-create-users.tsx app/\[lang\]/\(admin\)/admin/users/batch/page.tsx
git commit -m "feat(batch): add batch user creation page

- Form mode: dynamic rows with add/remove
- Import mode: CSV paste or file upload
- Preview count before submission
- Sequential creation with result summary
- Optional auto-create same-name player per user"
```

---

## Execution Summary

### Phase Dependencies

```
Phase 1 (parallel):  Task 1 ─┐
                     Task 2 ─┤── merge ──┐
                     Task 3 ─┘           │
                                         v
Phase 2 (parallel):  Task 4 ─┐── merge ──┐
                     Task 5 ─┘           │
                                         v
Phase 3 (parallel):  Task 6  (UserTable)
                     Task 7  (PlayerTable)
                     Task 8  (EditUserForm)
                     Task 9  (AdminManager + InviteManager)
                     Task 10 (SkinEditor + AdminPlayerEditor)
                     Task 11 (Profile page)
                     Task 12 (CreateUserForm)
                     Task 13 (Batch creation)
```

### File Ownership (Phase 3 — no conflicts)

| Task | Files Modified/Created |
|------|----------------------|
| 6 | `user-table.tsx`, `admin/users/page.tsx` |
| 7 | `player-table.tsx`, `admin/players/page.tsx` |
| 8 | `edit-user-form.tsx`, `admin/users/[uuid]/page.tsx` |
| 9 | `admin-manager.tsx`, `invite-manager.tsx` |
| 10 | `skin-editor.tsx`, `admin-player-editor.tsx` |
| 11 | `profile/page.tsx`, NEW: `profile-players.tsx`, `profile-password.tsx` |
| 12 | `create-user-form.tsx` |
| 13 | NEW: `batch-create-users.tsx`, `admin/users/batch/page.tsx`, `lib/actions/users.ts` |
