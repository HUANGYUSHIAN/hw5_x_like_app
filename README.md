# X-like App

一個模仿 X (Twitter) 的社群平台，使用 Next.js 16、Prisma、MongoDB、NextAuth 和 Pusher 建構。

## 功能特色

- ✅ OAuth 認證（Google/GitHub/Facebook）與本地開發模式
- ✅ 發文功能（280 字元限制，支援 URL/hashtag/mention）
- ✅ Home Feed（All/Following）與 Cursor-based 分頁
- ✅ 個人頁面（編輯/查看）、追蹤/取消追蹤
- ✅ 轉發 (Repost)、按讚 (Like)、留言 (Comments)
- ✅ 草稿保存與管理
- ✅ Pusher 即時更新（讚數、留言、轉發）

## 技術棧

- **Frontend**: Next.js 16 (App Router), React 19, Material UI
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas (via Prisma)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Real-time**: Pusher
- **Testing**: Playwright (E2E), Vitest (Unit)

## 快速開始

### 前置需求

- Node.js 18+
- MongoDB (本地或 Atlas)
- (可選) Pusher 帳號

### 安裝

```bash
# 安裝依賴
npm install

# 生成 Prisma Client
npm run db:generate

# 同步資料庫 Schema
npm run db:push
```

### 環境變數設置

建立 `.env.local` 檔案（參考 `.env.example`）：

```env
# Database
DATABASE_URL="mongodb://localhost:27017/x_like_app"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers (可選)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# Pusher (可選，用於即時功能)
PUSHER_APP_ID=""
PUSHER_KEY=""
PUSHER_SECRET=""
PUSHER_CLUSTER=""
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER=""

# Feature Toggle
LOCAL_AUTH=true  # 本地開發時設為 true
```

### 執行開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用程式。

### 本地認證模式

當 `LOCAL_AUTH=true` 時，可以訪問 `/auth/local` 進行本地登入，無需設置 OAuth providers。

## 測試

### E2E 測試 (Playwright)

```bash
# 安裝 Playwright 瀏覽器
npx playwright install

# 執行 E2E 測試
npm run test:e2e

# UI 模式
npm run test:e2e:ui
```

### 單元測試 (Vitest)

```bash
# 執行單元測試
npm test

# 監聽模式
npm test -- --watch
```

詳細測試文檔請參考 [test/README.md](test/README.md)

## 專案結構

詳細的功能對應檔案索引請參考 [plan/structure.md](plan/structure.md)

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API Routes
│   ├── [userId]/     # 使用者頁面
│   ├── posts/        # 文章詳情
│   └── drafts/       # 草稿頁
├── components/       # React 組件
├── lib/              # 工具函數
├── hooks/            # React Hooks
└── types/            # TypeScript 類型
```

## 部署

### Vercel 部署

1. 將專案推送到 GitHub
2. 在 Vercel 中匯入專案
3. 設置環境變數（參考 `.env.example`）
4. 將 `LOCAL_AUTH` 設為 `false`
5. 部署

### 環境變數設置

在 Vercel 專案設定中，添加所有必要的環境變數：
- `DATABASE_URL` (MongoDB Atlas 連接字串)
- `NEXTAUTH_URL` (你的 Vercel URL)
- `NEXTAUTH_SECRET`
- OAuth provider credentials
- Pusher credentials

## 開發指南

### 新增功能

1. 參考 [plan/structure.md](plan/structure.md) 找到相關檔案
2. 遵循現有的檔案結構和命名規範
3. 更新對應的文檔

### API 端點

所有 API 端點位於 `src/app/api/` 目錄下，遵循 RESTful 規範。

### 資料庫操作

使用 Prisma Client 進行資料庫操作：

```typescript
import { prisma } from '@/lib/prisma'

const posts = await prisma.post.findMany()
```

## 注意事項

- 所有 API routes 需要驗證 session（除公開端點）
- 字元計數：URL 固定 23 字元，hashtag/mention 不計入
- Cursor-based 分頁使用 `createdAt` timestamp
- Repost 不允許編輯/刪除原始文章
- 遵循 Next.js File-Based Routing 命名規範

## 授權

MIT
