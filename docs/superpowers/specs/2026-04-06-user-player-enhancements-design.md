# User & Player Management Enhancements Design

## Overview

Eight enhancements to the Drash admin dashboard covering permissions, UI improvements, and batch operations.

## Shared Infrastructure

### 1. Permission Utility (`lib/permissions.ts`)

Centralized permission logic used by both server actions and client components.

```typescript
canDeletePlayer(viewerRole: Role, viewerUsername: string,
                playerName: string, ownerUsername: string, ownerRole: Role): boolean
```

- Player name != owner username: anyone with permission can delete
- Player name == owner username (same-name player):
  - Admin can delete a **user**'s same-name player
  - Root can delete an **admin/user**'s same-name player
  - Nobody can delete their **own** same-name player

```typescript
canLockUser(viewerRole: Role, targetRole: Role, isSelf: boolean): boolean
```

- Admin cannot lock admin or root
- Root can lock everyone except self

```typescript
isMojangPlayer(player: APIPlayer): boolean
```

- Returns true when `player.fallbackPlayer` is truthy

```typescript
isStaff(user: APIUser): boolean
```

- Returns true when `user.maxPlayerCount > 1`

### 2. Sortable Table Hook (`hooks/use-sortable.ts`)

Generic client-side sorting hook for all list pages.

```typescript
useSortable<T>(items: T[], config: {
  defaultKey: string;
  defaultDirection: "asc" | "desc";
  sortFns: Record<string, (a: T, b: T) => number>;
}): { sorted: T[]; sortKey: string; direction: "asc" | "desc"; toggleSort: (key: string) => void }
```

Sort options per table:

| Page | Default Sort | Sortable Columns |
|------|-------------|-----------------|
| Users | admin first, then A-Z | username, admin, locked, playerCount |
| Players | name A-Z | name, owner, skinModel, createdAt |
| Invites | newest first | code, createdAt |
| Admins | admin first, then A-Z | username, role |

Table headers get clickable sort buttons with arrow indicators for direction. Clicking toggles asc/desc.

### 3. Mojang API Client (`lib/mojang.ts`)

Server action for Mojang UUID lookup:

```typescript
lookupMojangUuid(username: string): Promise<{ uuid: string; name: string } | null>
```

- Calls `https://api.mojang.com/users/profiles/minecraft/{username}`
- Returns `{ uuid, name }` on success, `null` on not found

### 4. Shared Player Creation Dialog (`components/create-player-dialog.tsx`)

Extracted from `edit-user-form.tsx` and enhanced. Used in three locations:
- `/admin/users/[uuid]` (admin editing user)
- `/admin/players` (admin player list)
- `/profile` (staff managing own players)

Props:

```typescript
interface CreatePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userUuid?: string;        // Pre-set when opened from user page
  users?: APIUser[];        // Provided when opened from players page (for user selection)
  isStaffMode?: boolean;    // Staff mode: restricted to own players only
}
```

Dialog features:
- Mode toggle: "New Player" / "Existing Player"
- **New Player mode**: name, skin model, skin file, cape file
- **Existing Player mode**: Minecraft username lookup (calls `lookupMojangUuid`) OR direct UUID input; shows resolved UUID after lookup
- When opened from players page: additional "Owner" dropdown to select which user
- When in staff mode: no owner selection, always creates for self

## Feature Implementations

### Feature 1: Staff Capabilities (Profile + Admin User Edit)

**Profile page** (`app/[lang]/(user)/profile/page.tsx`):

When `isStaff(user)` is true, add:
- **Password change card**: password input + save button, calls `updateUserAction`
- **Player management**: each player card gets a delete button, governed by `canDeletePlayer()`. "Create Player" button opens `CreatePlayerDialog` with `isStaffMode=true`
- Regular users (maxPlayerCount <= 1) see the existing read-only view unchanged

**Admin user edit page** (`components/edit-user-form.tsx`):

- Each player in the Players card gets a delete button
- Delete button uses `canDeletePlayer()` to determine enabled/disabled state
- Disabled same-name players show tooltip explaining why

### Feature 2: Hide Skin/Cape Controls for Mojang Players

- `SkinEditor` gets a new `readonly?: boolean` prop
- When `readonly=true`: show 3D preview only + info message "Textures are from Mojang and cannot be modified"; hide upload, URL input, and delete buttons
- `AdminPlayerEditor` checks `isMojangPlayer(player)` and passes `readonly` accordingly
- Profile page: Mojang players don't show "edit skin" link

### Feature 3: Lock Restrictions

- `UserTable` receives `viewerRole` prop
- `EditUserForm` already has `viewerRole`
- Both use `canLockUser()` to control lock/unlock button disabled state
- When disabled, show tooltip: "Cannot lock users of equal or higher role"

### Feature 4: Sortable Lists

All four list pages get sortable column headers:
- `UserTable`, `PlayerTable`, `InviteManager`, `AdminManager`
- Each uses `useSortable` hook with table-specific sort functions
- Visual: clickable header with arrow icon indicating current sort direction

### Feature 5: Player Creation from Admin Players Page

- `PlayerTable` gets a "Create Player" button in the toolbar (next to search)
- Opens `CreatePlayerDialog` with `users` prop for owner selection
- Requires passing the users list to `PlayerTable`

### Feature 6: "Existing Player" Option in Player Creation

Integrated into `CreatePlayerDialog` (Section 4 above).

Also update `CreateUserForm` (`components/create-user-form.tsx`):
- When "existingPlayer" is checked in advanced section, show Mojang username lookup field with search button alongside the existing UUID field

### Feature 7: Profile Shows Player Limit

Profile info card adds a new grid item:
- Label: "Player Limit" (i18n)
- Value: `{current} / {max}` (e.g., "2 / 5")
- When `maxPlayerCount === -1`: show "Unlimited"

### Feature 8: Batch User Creation

**New page**: `/admin/users/batch`

**Entry point**: "Batch Create" button next to "Create User" on users list page.

**Two modes** (tab toggle):

1. **Form mode**: Dynamic rows table with columns: Username*, Password*, MaxPlayerCount, isAdmin (root only), isLocked. Add/remove row buttons.
2. **Import mode**: Textarea for CSV paste or file upload button. Format: `username,password[,maxPlayerCount,isAdmin,isLocked,preferredLanguage]`. Required fields: username, password. Optional fields use defaults if omitted.

**Common controls**:
- Checkbox: "Auto-create same-name player for each user"
- Preview table showing parsed data before submission

**Server action** (`lib/actions/users.ts`):

```typescript
batchCreateUsersAction(users: BatchUserInput[]): Promise<BatchResult[]>

interface BatchUserInput {
  username: string;
  password: string;
  maxPlayerCount?: number;
  isAdmin?: boolean;
  isLocked?: boolean;
  preferredLanguage?: string;
  createPlayer?: boolean;
}

interface BatchResult {
  username: string;
  success: boolean;
  error?: string;
}
```

**Execution flow**:
1. User fills form or imports CSV -> preview table displayed
2. Click "Create" -> sequential API calls (avoid rate limiting)
3. Progress indicator: "Creating... 2/3"
4. Result summary: N succeeded, M failed (with error reasons)
5. Failed items remain in list for retry after editing

## Files to Create

- `lib/permissions.ts` - Permission utility functions
- `hooks/use-sortable.ts` - Generic sorting hook
- `lib/mojang.ts` - Mojang API server action
- `components/create-player-dialog.tsx` - Shared player creation dialog
- `app/[lang]/(admin)/admin/users/batch/page.tsx` - Batch creation page
- `components/batch-create-users.tsx` - Batch creation form component

## Files to Modify

- `components/user-table.tsx` - Add sorting, lock restrictions, batch create button
- `components/player-table.tsx` - Add sorting, create player button
- `components/admin-manager.tsx` - Add sorting
- `components/invite-manager.tsx` - Add sorting
- `components/edit-user-form.tsx` - Player delete buttons with permission checks
- `components/create-user-form.tsx` - Mojang lookup for existing player
- `components/skin-editor.tsx` - Add readonly prop for Mojang players
- `components/admin-player-editor.tsx` - Pass readonly to SkinEditor for Mojang players
- `app/[lang]/(user)/profile/page.tsx` - Staff features, player limit display
- `lib/actions/users.ts` - Batch create action
- `lib/actions/players.ts` - Update delete action with permission checks
- `messages/en.json` - New i18n keys
- `messages/zh-TW.json` - New i18n keys
