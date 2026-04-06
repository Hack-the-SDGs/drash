# Drasl Admin Panel - Design Spec

## Overview

A web-based management panel for a Drasl (Minecraft authentication server) instance at `https://drasl.ntust.camp/`. Built for use during a camp event, providing three permission tiers: root, admin, and user. Maximizes all Drasl API v2 capabilities.

## Context

**Drasl config highlights:**
- Registration closed (`Allow = false`) — all accounts created by admins
- `AllowChangingPlayerName = false`, `AllowAddingDeletingPlayers = false` — users cannot change names or manage players
- 7 DefaultAdmins configured
- Mojang fallback enabled for existing player import

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS 4 |
| Deployment | Cloudflare Workers via `@opennextjs/cloudflare` |
| i18n | `next-intl` (App Router, `[locale]` prefix routing) |
| 3D Skin | `skinview3d` (Three.js-based Minecraft skin viewer) |
| Auth | httpOnly cookie storing Drasl API token |

**Environment Variables:**

| Variable | Purpose |
|----------|---------|
| `DRASL_API_URL` | Drasl API base URL (`https://drasl.ntust.camp`) |
| `ROOT_USERNAME` | Root user's username |

## Architecture

```
Browser → Next.js (CF Workers) → Drasl API
               ↕
        httpOnly cookie (API token)
```

- **Data reads:** React Server Components fetch Drasl API on the server
- **Data writes:** Server Actions handle all mutations
- **Auth:** API token in httpOnly cookie, server injects `Authorization` header
- **Permissions:** Root check happens server-side (compare env var), never exposed to frontend
- **Client Components:** Only for 3D skin viewer, forms, search/filter interactions

## Authentication & Authorization

### Login Flow

1. User enters username + password on login page
2. Server Action calls `POST /drasl/api/v2/login`
3. Receives `{ apiToken, user }`
4. Sets httpOnly cookies:
   - `drasl_token`: the API token (httpOnly, secure, sameSite=strict)
   - `drasl_user`: JSON with `{ uuid, username, isAdmin }` (httpOnly, secure, sameSite=strict) — used by middleware for quick role routing without an API call. Actual authorization is enforced in Server Components/Actions which verify the token against Drasl API.
5. Redirects based on role:
   - root/admin → `/admin/users`
   - user → `/profile`

### Role Determination (server-side)

```
function getRole(user):
  if user.username === env.ROOT_USERNAME && user.isAdmin → "root"
  if user.isAdmin → "admin"
  else → "user"
```

Root must also be a Drasl admin (double protection).

### Middleware Route Protection

| Route | Minimum Role |
|-------|-------------|
| `/login` | Public |
| `/profile`, `/players/[uuid]` | user (authenticated) |
| `/admin/*` | admin |
| `/admin/admins` | root |

- Unauthenticated → redirect to `/login`
- Insufficient permissions → redirect to role's home page
- Higher roles can access lower-role routes (admin/root can access `/profile`, `/players/[uuid]`)

### Logout

Clear httpOnly cookies, redirect to `/login`. Drasl API has no logout endpoint; token remains valid on Drasl side until reset (`resetApiToken: true`).

## Route Structure

```
app/
├── [locale]/                         # i18n: zh-TW, en
│   ├── login/page.tsx                # Login page
│   │
│   ├── (user)/                       # All authenticated users
│   │   ├── layout.tsx                # User layout (top nav)
│   │   ├── profile/page.tsx          # Own profile + player list
│   │   └── players/
│   │       └── [uuid]/page.tsx       # Edit own player skin/cape (3D viewer)
│   │
│   └── (admin)/                      # admin + root
│       ├── layout.tsx                # Admin layout (sidebar)
│       └── admin/
│           ├── users/
│           │   ├── page.tsx          # User list (search/filter/bulk ops)
│           │   ├── new/page.tsx      # Create user
│           │   └── [uuid]/page.tsx   # Edit user (password/lock/players/OIDC)
│           ├── players/
│           │   ├── page.tsx          # All players list
│           │   └── [uuid]/page.tsx   # Edit any player
│           ├── invites/page.tsx      # Invite management
│           └── admins/page.tsx       # [root only] Admin promotion/demotion
│
├── layout.tsx                        # Root layout (fonts, global styles)
└── middleware.ts                     # Auth + role-based route protection
```

## Page-to-API Mapping

| Page | Features | API Endpoints |
|------|----------|---------------|
| **Login** | Username/password auth | `POST /login` |
| **Profile** | View own user + players | `GET /user` |
| **Edit Player Skin** | Upload skin/cape, choose model, 3D preview | `PATCH /players/{uuid}` |
| **User List** | Table of all users with search/sort/bulk lock | `GET /users` |
| **Create User** | Form: username, password, playerName, skin, cape, settings | `POST /users` |
| **Edit User** | Change password, lock/unlock, maxPlayerCount, language, reset tokens, manage players, OIDC | `PATCH /users/{uuid}`, `POST/DELETE /users/{uuid}/oidc-identities`, `POST /players`, `DELETE /players/{uuid}` |
| **Player List** | All players table with skin thumbnails | `GET /players` |
| **Edit Player** | Rename, skin/cape, fallbackPlayer, 3D preview | `PATCH /players/{uuid}` |
| **Invites** | List + one-click create + delete + copy link | `GET/POST /invites`, `DELETE /invites/{code}` |
| **Admin Management** | Promote/demote admin privileges | `PATCH /users/{uuid}` with `isAdmin` |

### Additional API Coverage

| API | Where Used |
|-----|-----------|
| `GET /challenge-skin` | Integrated in create user flow when skin verification is enabled |
| `POST /players` | In "Edit User" page, add player to a user |
| `DELETE /players/{uuid}` | In player list and edit user page |
| `DELETE /user`, `DELETE /users/{uuid}` | Delete button in user list and edit page |
| `resetApiToken`, `resetMinecraftToken` | Reset buttons in edit user page |

## UI Layout

### User Layout (`(user)/layout.tsx`)

```
┌─────────────────────────────────────────┐
│  Top Nav: Logo  |  Lang Switch  | Logout│
├─────────────────────────────────────────┤
│                                         │
│            Page Content                 │
│                                         │
└─────────────────────────────────────────┘
```

Simple top navigation. Users only see their own profile and players.

### Admin Layout (`(admin)/layout.tsx`)

```
┌──────────┬──────────────────────────────┐
│ Sidebar  │  Top: Breadcrumbs | Lang | X │
│          ├──────────────────────────────┤
│ Users    │                              │
│ Players  │         Page Content         │
│ Invites  │                              │
│ ──────── │                              │
│ Admins   │  ← root only visible         │
│          │                              │
└──────────┴──────────────────────────────┘
```

Sidebar + content area. Sidebar collapses to hamburger menu on mobile.

## Core Components

| Component | Purpose |
|-----------|---------|
| `SkinViewer` | Wraps skinview3d, 3D preview of skin/cape with rotation |
| `SkinUploader` | Drag-and-drop / click upload for skin/cape PNG, instant preview, classic/slim model selector |
| `UserTable` | User list table with search, sort, bulk lock/unlock |
| `PlayerTable` | Player list table with skin thumbnails, owning user |
| `UserForm` | Create/edit user form |
| `InviteList` | Invite code list with one-click copy, create, delete |
| `ConfirmDialog` | Confirmation dialog for dangerous operations (delete, reset token) |

## Key Interaction Flows

### User Changes Skin

```
Profile → Click player → /players/[uuid]
  → See current 3D preview
  → Upload new skin PNG / enter skin URL
  → Select classic or slim model
  → Instant local preview in 3D viewer (not saved yet)
  → Click save → Server Action PATCH /players/{uuid}
  → revalidatePath refreshes page
```

### Admin Creates User

```
User list → Click "New" → /admin/users/new
  → Fill username, password, playerName
  → Optional: upload skin/cape, set fallbackPlayer
  → Optional: isAdmin (root only visible), isLocked, maxPlayerCount
  → Submit → Server Action POST /users
  → Redirect to user list
```

## i18n

- `next-intl` with route prefix: `/zh-TW/...` and `/en/...`
- Default locale: `zh-TW`
- Translation files: `messages/zh-TW.json` and `messages/en.json`
- Middleware detects browser language, redirects to matching locale on first visit

## Server-Side API Layer

```
lib/
├── drasl/
│   ├── client.ts       # Fetch wrapper: auto token, error handling, base URL
│   ├── auth.ts         # login, getSession, getRole
│   ├── users.ts        # getUsers, getUser, createUser, updateUser, deleteUser
│   ├── players.ts      # getPlayers, getPlayer, createPlayer, updatePlayer, deletePlayer
│   ├── invites.ts      # getInvites, createInvite, deleteInvite
│   └── oidc.ts         # createOIDCIdentity, deleteOIDCIdentity
├── actions/            # Server Actions (call API functions above)
│   ├── auth.ts         # loginAction, logoutAction
│   ├── users.ts        # createUserAction, updateUserAction, deleteUserAction...
│   ├── players.ts      # updatePlayerAction, deletePlayerAction...
│   └── invites.ts      # createInviteAction, deleteInviteAction
└── types.ts            # TypeScript types (from Swagger schema)
```

### `client.ts` Core Logic

- Reads API token from cookie
- Auto-injects `Authorization: Bearer <token>`
- Unified error handling:
  - 401 → clear cookies, redirect to login
  - 403 → insufficient permissions message
