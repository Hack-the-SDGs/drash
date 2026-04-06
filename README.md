<div align="center">

[![Banner](https://github.com/Hack-the-SDGs/drash/blob/main/.github/assets/banner.png?raw=true)](https://github.com/Hack-the-SDGs/drash)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

## 總覽

Drash 是 [Drasl](https://github.com/unmojang/drasl) 的現代化 Web 管理面板，讓你透過直覺的介面管理 Minecraft 驗證伺服器的使用者、角色與外觀。

底層使用 Next.js App Router + Server Actions 與 Drasl API v2 溝通，前端採 shadcn/ui 元件庫搭配 Tailwind CSS，並以 skinview3d 提供 3D 皮膚預覽。

### 特色

- **使用者管理** — 建立、編輯、鎖定、刪除使用者帳號，支援角色權限控管
- **角色管理** — 建立 Minecraft 角色、自訂 UUID、上傳皮膚與披風
- **3D 皮膚預覽** — 即時渲染角色皮膚，支援 classic / slim 模型
- **邀請碼系統** — 產生與管理邀請碼，控制註冊流程
- **管理員控制** — 分層權限（root / admin / user），root 可管理管理員
- **多語系** — 支援繁體中文與英文，自動偵測瀏覽器語系
- **深色主題** — 預設深色介面，支援明暗切換

## 前置需求

| 項目 | 需求 |
|------|------|
| Node.js | 18+ |
| Drasl Server | 已部署並開啟 API v2 |

## 安裝

```bash
git clone https://github.com/Hack-the-SDGs/drash.git
cd drash
npm install
```

## 快速開始

```bash
# 開發模式
npm run dev

# 建置
npm run build

# 啟動
npm start
```

開啟 [http://localhost:3000](http://localhost:3000) 即可使用。

## 專案結構

```
drash/
├── app/
│   ├── layout.tsx            # 根 layout（字型、metadata、Toaster）
│   ├── page.tsx              # 根路由重導
│   └── [lang]/               # 語系路由
│       ├── login/            # 登入頁面
│       ├── (user)/           # 使用者路由（需登入）
│       │   ├── profile/      # 個人設定
│       │   └── players/      # 角色管理
│       └── (admin)/          # 管理員路由（需 admin/root）
│           └── admin/
│               ├── users/    # 使用者管理
│               ├── players/  # 角色探索
│               ├── invites/  # 邀請碼管理
│               └── admins/   # 管理員管理（root）
│
├── components/               # React 元件
│   ├── ui/                   # shadcn/ui 基礎元件
│   ├── skin-viewer.tsx       # 3D 皮膚預覽
│   ├── skin-editor.tsx       # 皮膚上傳編輯
│   ├── player-table.tsx      # 角色列表
│   ├── user-table.tsx        # 使用者列表
│   ├── sidebar-nav.tsx       # 側邊導覽
│   └── ...
│
├── lib/
│   ├── drasl/                # Drasl API 客戶端
│   │   ├── client.ts         # HTTP 客戶端（含認證）
│   │   ├── auth.ts           # 驗證端點
│   │   ├── users.ts          # 使用者 API
│   │   ├── players.ts        # 角色 API
│   │   └── textures.ts       # 材質管理
│   ├── actions/              # Server Actions
│   │   ├── auth.ts           # 登入登出
│   │   ├── users.ts          # 使用者操作
│   │   └── players.ts        # 角色操作
│   ├── types.ts              # TypeScript 型別定義
│   └── dictionaries.ts       # i18n 字典管理
│
├── messages/                 # 語系檔案
│   ├── en.json               # English
│   └── zh-TW.json            # 繁體中文
│
└── proxy.ts                  # 中介層（語系偵測、認證檢查）
```

## 開發

```bash
# 開發伺服器
npm run dev

# Lint 檢查
npm run lint

# 建置
npm run build
```

## 貢獻

歡迎 PR 與 Issue！

送出前請確認：
1. 遵循現有的程式碼風格與架構慣例
2. 通過 `npm run lint` 與 `npm run build`
3. 以 `feature/your-feature` 或 `fix/your-fix` 命名分支
4. 發布 PR 時，目標分支為 `dev`

## 授權
本專案採用 [GNU Affero General Public License v3.0](LICENSE) 授權。