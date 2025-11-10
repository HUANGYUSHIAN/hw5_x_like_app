# X-like App 功能對應檔案索引

本文檔提供功能與對應程式碼檔案的快速索引，方便根據功能快速找到相關程式碼。

## 認證 (Authentication)

### OAuth 登入
- **NextAuth 配置**: `src/app/api/auth/[...nextauth]/route.ts`
- **Session API**: `src/app/api/auth/session/route.ts`
- **本地認證 (LOCAL_AUTH)**: `src/app/api/auth/local/route.ts`
- **本地登入頁面**: `src/app/auth/local/page.tsx`
- **認證工具函數**: `src/lib/auth.ts`

### Session 管理
- **Session Provider**: `src/components/providers/SessionProvider.tsx`

## 使用者 (Users)

### 使用者 API
- **取得/更新使用者資料**: `src/app/api/users/[userId]/route.ts`
- **追蹤/取消追蹤**: `src/app/api/users/[userId]/follow/route.ts`
- **取得追蹤者列表**: `src/app/api/users/[userId]/followers/route.ts`
- **取得追蹤中列表**: `src/app/api/users/[userId]/following/route.ts`

### 使用者頁面
- **個人頁面**: `src/app/[userId]/page.tsx`
- **個人頁面 Header**: `src/components/profile/ProfileHeader.tsx`
- **個人頁面 Tabs**: `src/components/profile/ProfileTabs.tsx`

## 文章 (Posts)

### 文章 API
- **取得 Feed / 建立文章**: `src/app/api/posts/route.ts`
- **取得/更新/刪除單篇文章**: `src/app/api/posts/[postId]/route.ts`
- **按讚/取消讚**: `src/app/api/posts/[postId]/like/route.ts`
- **取得/建立留言**: `src/app/api/posts/[postId]/comments/route.ts`

### 文章頁面與組件
- **首頁 Feed**: `src/app/page.tsx`
- **文章詳情頁**: `src/app/posts/[postId]/page.tsx`
- **文章卡片**: `src/components/post/PostCard.tsx`
- **發文編輯器**: `src/components/post/PostComposer.tsx`
- **文章操作按鈕**: `src/components/post/PostActions.tsx`

## 留言 (Comments)

### 留言功能
- **留言 API**: `src/app/api/posts/[postId]/comments/route.ts` (GET/POST)
- **留言顯示**: `src/app/posts/[postId]/page.tsx` (內嵌在文章詳情頁)

## 草稿 (Drafts)

### 草稿 API
- **取得/建立/更新草稿**: `src/app/api/drafts/route.ts`
- **刪除草稿**: `src/app/api/drafts/[draftId]/route.ts`

### 草稿頁面
- **草稿列表**: `src/app/drafts/page.tsx`
- **草稿管理**: 整合在 `PostComposer` 中

## 即時更新 (Real-time / Pusher)

### Pusher 配置
- **客戶端配置**: `src/lib/pusher.ts`
- **伺服器端配置**: `src/lib/pusher-server.ts`
- **Pusher 認證**: `src/app/api/pusher/auth/route.ts`
- **Pusher Hook**: `src/hooks/usePusher.ts`

### 即時更新整合
- **文章即時更新**: `src/components/post/PostCard.tsx` (使用 `usePusher`)
- **API 事件觸發**: 各 API routes 中發送 Pusher 事件

## 布局 (Layout)

### 布局組件
- **側邊欄**: `src/components/layout/Sidebar.tsx`
- **主內容區**: `src/components/layout/MainContent.tsx`
- **右側欄**: `src/components/layout/RightSidebar.tsx`
- **根布局**: `src/app/layout.tsx`

## 工具組件 (Utilities)

### 內容處理
- **內容解析 (hashtag/mention/link)**: `src/components/utils/ContentParser.tsx`
- **相對時間顯示**: `src/components/utils/RelativeTime.tsx`
- **字元計數**: `src/lib/utils.ts` (`calculateCharacterCount`)
- **內容解析工具**: `src/lib/utils.ts` (`parseContent`)

### 工具函數
- **工具函數庫**: `src/lib/utils.ts`
- **驗證 Schema**: `src/lib/validations.ts`
- **Prisma Client**: `src/lib/prisma.ts`
- **Material UI 主題**: `src/lib/theme.ts`

## 資料模型 (Data Models)

### Prisma Schema
- **資料庫 Schema**: `prisma/schema.prisma`
- **TypeScript 類型**: `src/types/index.ts`

## 測試 (Testing)

### E2E 測試 (Playwright)
- **認證測試**: `test/e2e/auth.spec.ts`
- **文章測試**: `test/e2e/posts.spec.ts`
- **即時更新測試**: `test/e2e/realtime.spec.ts`
- **個人頁面測試**: `test/e2e/profile.spec.ts`
- **Playwright 配置**: `playwright.config.ts`

### 單元測試 (Vitest)
- **內容解析測試**: `test/unit/content-parser.test.ts`
- **字元計數測試**: `test/unit/character-count.test.ts`
- **Vitest 配置**: `vitest.config.ts`

### 測試腳本
- **資料庫種子**: `test/scripts/seed-db.ts`
- **API 測試腳本**: `test/scripts/test-api.ps1`
- **測試文檔**: `test/README.md`

## 環境配置

### 環境變數
- **環境變數範例**: `.env.example` (需手動建立)
- **Next.js 配置**: `next.config.ts`

### 套件配置
- **Package.json**: `package.json`
- **TypeScript 配置**: `tsconfig.json`

## 功能快速查找

### 我想找到...

#### 發文功能
1. 發文 UI: `src/components/post/PostComposer.tsx`
2. 發文 API: `src/app/api/posts/route.ts` (POST)
3. 字元計數: `src/lib/utils.ts` (`calculateCharacterCount`)

#### 按讚功能
1. 按讚按鈕: `src/components/post/PostCard.tsx` 或 `src/components/post/PostActions.tsx`
2. 按讚 API: `src/app/api/posts/[postId]/like/route.ts`
3. 即時更新: `src/components/post/PostCard.tsx` (使用 `usePusher`)

#### 留言功能
1. 留言 UI: `src/app/posts/[postId]/page.tsx`
2. 留言 API: `src/app/api/posts/[postId]/comments/route.ts`
3. 留言顯示: `src/app/posts/[postId]/page.tsx`

#### 追蹤功能
1. 追蹤按鈕: `src/components/profile/ProfileHeader.tsx`
2. 追蹤 API: `src/app/api/users/[userId]/follow/route.ts`
3. 追蹤列表: `src/app/api/users/[userId]/followers/route.ts` 和 `following/route.ts`

#### 個人頁面
1. 個人頁面: `src/app/[userId]/page.tsx`
2. 個人頁面 Header: `src/components/profile/ProfileHeader.tsx`
3. 個人頁面 Tabs: `src/components/profile/ProfileTabs.tsx`

#### 認證功能
1. NextAuth 配置: `src/app/api/auth/[...nextauth]/route.ts`
2. 本地認證: `src/app/api/auth/local/route.ts` 和 `src/app/auth/local/page.tsx`
3. Session 管理: `src/lib/auth.ts`

#### 即時更新
1. Pusher 客戶端: `src/lib/pusher.ts`
2. Pusher 伺服器: `src/lib/pusher-server.ts`
3. Pusher Hook: `src/hooks/usePusher.ts`
4. Pusher 認證: `src/app/api/pusher/auth/route.ts`

#### 內容解析 (hashtag/mention/link)
1. 解析工具: `src/lib/utils.ts` (`parseContent`)
2. 顯示組件: `src/components/utils/ContentParser.tsx`
3. 字元計數: `src/lib/utils.ts` (`calculateCharacterCount`)

#### 草稿功能
1. 草稿列表: `src/app/drafts/page.tsx`
2. 草稿 API: `src/app/api/drafts/route.ts` 和 `src/app/api/drafts/[draftId]/route.ts`
3. 草稿保存: `src/components/post/PostComposer.tsx` (Save Draft 按鈕)

## 檔案結構總覽

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # 認證相關 API
│   │   ├── users/                # 使用者相關 API
│   │   ├── posts/                # 文章相關 API
│   │   ├── drafts/               # 草稿相關 API
│   │   └── pusher/               # Pusher 認證 API
│   ├── [userId]/                 # 動態路由：使用者頁面
│   ├── posts/[postId]/           # 動態路由：文章詳情
│   ├── drafts/                   # 草稿頁
│   ├── auth/local/               # 本地認證頁
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home feed
├── components/
│   ├── layout/                   # 布局組件
│   ├── post/                     # 文章相關組件
│   ├── profile/                  # 個人頁面組件
│   ├── providers/                # Context Providers
│   └── utils/                     # 工具組件
├── lib/                          # 工具函數
│   ├── auth.ts                   # 認證工具
│   ├── prisma.ts                 # Prisma Client
│   ├── pusher.ts                 # Pusher 客戶端
│   ├── pusher-server.ts          # Pusher 伺服器
│   ├── utils.ts                  # 通用工具函數
│   ├── validations.ts            # Zod 驗證 Schema
│   └── theme.ts                  # Material UI 主題
├── hooks/                        # React Hooks
│   └── usePusher.ts              # Pusher Hook
└── types/                        # TypeScript 類型定義
    └── index.ts
```

## 開發流程

### 新增功能時
1. 確定功能類別（認證/使用者/文章/等）
2. 參考對應的 API routes 和組件
3. 遵循現有的檔案結構和命名規範
4. 更新本索引文檔

### 除錯時
1. 根據功能查找對應的檔案
2. 檢查 API routes 的錯誤處理
3. 查看瀏覽器 console 和伺服器 logs
4. 使用測試腳本驗證功能











