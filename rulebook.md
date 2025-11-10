# X-like (仿 Twitter) 全端服務 — 規格書


## 1. 專案總覽

目標：使用 Next.js 建立一個類似 Twitter（X）的社群平台，支援 OAuth（Google/GitHub/Facebook）、文章發佈/轉發/留言/按讚、個人頁面、草稿、以及即時互動（使用 Pusher）。後端以 Prisma + MongoDB Atlas 為資料層，部署至 Vercel。

最小可行功能(MVP)：
- OAuth 註冊/登入（NextAuth）與 session 管理
- 發文（280 字元上限、連結佔 23 字元、#HashTag 與 @mention 不計字元）
- Home 流（All / Following）與 Cursor-based 分頁
- Profile 頁（編輯/查看）、Follow/Unfollow
- Repost (retweet-like)、Like toggle、Comments (recursive)
- 草稿保存與管理
- Pusher 實時更新（讚數、留言、轉發）

非必要進階功能（可延後）：多媒體、長文支援、quote repost、推播通知到行動裝置、DM。


## 2. 高階系統架構

- Frontend: Next.js（React）
  - 使用 Material UI 風格（自訂 icons）模擬 X 的外觀
  - SSR/ISR for public pages；client-side for interactive parts
- Auth: NextAuth.js（Google / GitHub / Facebook）
- Backend: Next.js API Routes（或獨立 Node/Express），採 RESTful API
- ORM: Prisma（schema.prisma）
- DB: MongoDB Atlas
- Real-time: Pusher（channels & events）
- Deploy: Vercel（frontend + serverless functions），環境變數使用 `.env`（在 Vercel UI 或 GitHub Secrets 設定）

Component interaction:
- 前端呼叫 Next.js API Routes -> API 使用 Prisma 存取 DB -> 變更後發送 Pusher 事件 -> 其他用戶透過 Pusher Channel 接收更新


## 3. Prisma 資料模型（建議）

> 以下以 Prisma schema（可用於 MongoDB）示例。實際欄位型別根據 DB 選擇調整。

```prisma
// schema.prisma（示意）
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb" 
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(auto()) @map("_id") // mongodb
  userId        String   @unique // 使用者選的 userID (string)
  name          String
  email         String?  @unique
  avatarUrl     String?
  bio           String?
  backgroundUrl String?
  provider      String   // e.g. 'google'|'github'|'facebook'
  providerId    String   // provider 的 user id
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  posts         Post[]   @relation("author_posts")
  likes         Like[]
  followers     Follow[] @relation("following_relation")
  following     Follow[] @relation("follower_relation")
  drafts        Draft[]
}

model Post {
  id          String    @id @default(auto()) @map("_id")
  author      User      @relation(fields: [authorId], references: [id])
  authorId    String
  content     String
  isRepost    Boolean   @default(false)
  repostOfId  String?   // 指向被 repost 的 post id
  createdAt   DateTime  @default(now())
  updatedAt   DateTime?

  likes       Like[]
  comments    Comment[] @relation("post_comments")
  reposts     Post[]    @relation("repost_children")
}

model Comment {
  id        String   @id @default(auto()) @map("_id")
  post      Post     @relation(fields: [postId], references: [id])
  postId    String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  content   String
  parentId  String?  // recursive comments: null = top-level comment
  createdAt DateTime @default(now())
  replies   Comment[] @relation("comment_replies")
}

model Like {
  id       String   @id @default(auto()) @map("_id")
  user     User     @relation(fields: [userId], references: [id])
  userId   String
  post     Post     @relation(fields: [postId], references: [id])
  postId   String
  createdAt DateTime @default(now())

  @@unique([userId, postId])
}

model Follow {
  id          String   @id @default(auto()) @map("_id")
  follower    User     @relation("follower_relation", fields: [followerId], references: [id])
  followerId  String
  following   User     @relation("following_relation", fields: [followingId], references: [id])
  followingId String
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
}

model Draft {
  id        String   @id @default(auto()) @map("_id")
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  content   String
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

```

## 4. API 規格（RESTful）

> 以下路由範例以 `/api` 為 base，Next.js API Routes / Express 相同概念。請在每個需要授權的 API 加入 session 驗證（NextAuth token/session）。

### Auth
- `GET /api/auth/session` — 回傳當前 session
- NextAuth 內建 routes 處理 OAuth 登入/登出

### User / Profile
- `GET /api/users/:userId` — 取得公開 profile（包含 posts summary, counts）
- `PUT /api/users/:userId` — 編輯個人資料（需本人）

### Posts
- `GET /api/posts?limit=20&cursor=<cursor>&filter=all|following` — 取得 home feed（cursor 分頁）
- `GET /api/posts/:postId` — 取得單篇文章（含 nested comments）
- `POST /api/posts` — 發文（body: content, isRepost?, repostOfId?）
- `PUT /api/posts/:postId` — 編輯發文（本人限定，repost 不允許編輯）
- `DELETE /api/posts/:postId` — 刪除發文（本人限定，repost 無法刪除）

### Drafts
- `GET /api/drafts` — 取得使用者草稿列表
- `POST /api/drafts` — 建立/更新草稿
- `DELETE /api/drafts/:draftId` — 刪除草稿

### Likes
- `POST /api/posts/:postId/like` — toggle like（若已按讚則取消）
- `GET /api/posts/:postId/likes` — （可選）取得按讚列表（not necessary for MVP）

### Comments
- `POST /api/posts/:postId/comments` — 留言（body: content, parentId?）
- `GET /api/posts/:postId/comments?limit=20&cursor=` — 取得留言（cursor 分頁）

### Follow
- `POST /api/users/:userId/follow` — follow 或 unfollow（toggle）
- `GET /api/users/:userId/followers` — 追蹤者列表（可分頁）
- `GET /api/users/:userId/following` — 追蹤中列表


## 5. 前端介面細節（UI / UX）

整體原則：使用 Material UI 的 grid 與 card 元件模擬 X 的佈局。Icon 全部自訂 SVG（依您需求）。

### Layout
- 左側（可縮與展開）: Icon-only compact bar（含 → symbol toggle）與展開後的文字說明
  - 選單項：Home, Profile, Post (button), 更多（後面擴充）
  - 底部顯示小頭貼、姓名、userID（點擊彈出 logout）
- 中間欄：feed / single post / comment thread
  - 頂部 inline composer（按一下展開成 modal 樣式）
  - 每篇文章呈現 avatar、name、userID、發文時間（使用 relative time library）
  - 下方 action bar：commentCount, repostCount, likeCount（按鈕為 toggle）
- 右側（可選）：建議追蹤、熱門 hashTag（MVP 可簡化）

### Profile page
- 大頭貼 + 背景圖，右下角 Edit Profile / Follow 按鈕
- 顯示 name, @userID, bio, counts (posts, following, followers)
- Tab: Posts | Likes（only owner）
- 點擊別人的 userID 後在中欄顯示該 user 的 profile（read-only）

### Post Modal / Composer rules
- 限 280 字元
- 輸入時做即時字元計數：
  - 普通文字計數
  - 檢測 URL (regex)，每個 URL 固定計 23 字元
  - 檢測 #hashtag 與 @mention：不計入字元，但仍以 hyperlink 顯示
- 發文按鈕右下方；左上 X：關閉時提示 Save (draft) / Discard
- Drafts 頁面顯示草稿清單（編輯/刪除）


## 6. Mention / Hashtag / Link 處理細節
- **Link detection**: 使用 regex 檢測 URLs（包含 http(s) 與 www.）於前端輸入時計算字元長度並將它轉為超連結
- **Hashtag**: 前端自動解析 `#\w+`，當點擊跳到搜尋結果頁（或顯示含有該 hashtag 的帖子）
- **Mention**: `@userId` 解析為連結（點擊到 user profile）
- **字元計數策略**: 先找出所有 URL，將其佔用的文字視為每個 23 字元；#與@標記在計數時排除（但仍保留在內容中）


## 7. 時間/相對時間顯示
- 使用 dayjs 或 date-fns 顯示：
  - 幾秒前、幾分鐘前、幾小時前、幾天前；超過 1 年顯示完整日期。
- 對於排序與 cursor 使用 `createdAt` 的 UTC timestamp。


## 8. 即時互動（Pusher）

### 事件設計
- Channel：`public-posts`（All feed updates）、`user-<userId>`（私有，供該 user 接收例如被按讚或被留言通知）
- Events:
  - `post:created` — payload: { postId, authorId, createdAt }
  - `post:updated` — payload: { postId, updatedFields }
  - `post:liked` — payload: { postId, likeCount }
  - `post:commented` — payload: { postId, comment }
  - `user:followed`（可選）

### 使用情境
- 使用者 A 對文章 like，server 更新 DB 後發 `post:liked` 事件到該 post 的 public channel 與作者的私人 channel -> 所有訂閱該 channel 的客戶端即時更新數字。

### 安全
- 私有 channel（例如 `private-user-<id>`）需要透過 Pusher 的 auth endpoint 進行簽章驗證（NextAuth 驗證 session 後允許訂閱）。

## 9. Session / Auth 行為
- 使用 NextAuth：session token 存在 cookie（httpOnly）。
- 登入流程：OAuth 回傳 user info -> NextAuth callback 將 provider 與 providerId 與 userId 一起儲存到 User model（注意：不同 provider 若使用同 email 也視為不同帳號，因為您要求 userIDs 與 provider 綁定）。
- 新增欄位 `userId`（使用者在註冊時選擇），必須 unique。
- Session expiry: 可配置 `session.maxAge`（例如：30 days），如果 session 未過期直接自動登入。

## 10. .env（必要環境變數）

在 local 開發 (`local=true`) 與 deploy 時 (`local=false`) 有些行為不同（OAuth 會在 deploy 時啟用）。

**必要變數**：
```
# Database
DATABASE_URL=<MongoDB或Postgres連線字串>

# NextAuth
NEXTAUTH_URL=https://your-deploy-url.vercel.app  # local: http://localhost:3000
NEXTAUTH_SECRET=<strong-random-secret>

# OAuth providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Pusher
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=

# Vercel 環境變數
VERCEL=1

# Feature toggle
LOCAL_AUTH=true  # local 開發時可用假登入流程；deploy 時設為 false
```

> 備註：不要把 `.env` 加到版本控制；在 Vercel 中透過 Project Settings > Environment Variables 設定。


## 11. 安全性與權限控制
- API 層必須驗證 session，以確保只有授權使用者可以發文/按讚/留言/編輯/刪除。
- 編輯/刪除 post 僅允許該文章作者（且該文章不是 repost）
- Like toggle 防止 race condition：在 DB 層使用唯一鍵（userId+postId）或 transaction
- 防止 XSS：輸出時 sanitize user-generated content（對 mention/hashtag/link 做 safe HTML 轉換）


## 12. Index 與效能建議
- 在 `Post` collection 上建立 `createdAt` index（降冪查詢）
- 需要 filter `authorId` 時建立 `authorId + createdAt` 複合索引
- Like table: unique index on (userId, postId)
- Follow table: unique index on (followerId, followingId)


## 13. 測試建議
- 單元測試：Auth callback, Post create/edit/delete, Like toggle, Cursor 分頁邊界
- E2E 測試：使用 Playwright 或 Cypress 模擬兩個使用者同時按讚測試 Pusher 即時更新
- Load test：簡單使用 k6 或 artillery 測試 feed 請求效能


## 14. 部署步驟（建議）
1. Local 開發
   - 設 `LOCAL_AUTH=true`，允許直接以 fake user 建 account（方便快速開發前端/後端）
   - 建立 `prisma migrate` 或 `prisma db push` 初始化 schema
2. 設定 MongoDB Atlas
3. Vercel 部署
   - 設定環境變數（DATABASE_URL, NEXTAUTH_SECRET, providers, PUSHER_*）
   - 設定 build command: `yarn build`，start: `yarn start`（Next.js 會自動處理）
4. Pusher：建立 App，拿到 KEY/SECRET/ID/CLUSTER 並放在 env
5. 最後在 Vercel 上將 `LOCAL_AUTH=false`


## 15. 開發優先順序（迭代建議）
- Phase 0（準備）：建立 repo、Next.js skeleton、Prisma schema、DB 連線、環境變數管理
- Phase 1（最小可行）：Auth (local fake) + user model + CRUD posts + Cursor feed + UI layout（左/中/右）
- Phase 2：OAuth (NextAuth) 整合 + Profile edit + Drafts + Like/Follow
- Phase 3：Pusher 即時功能 + Repost + Comments (recursive)
- Phase 4（deploy）：MongoDB Atlas / Pusher / Vercel 部署、測試與 bugfix


## 16. API 範例（JSON 範例）
- `GET /api/posts?limit=2`
```json
{
  "items": [
    { "id": "p3", "author": {"userId":"ric2k1","name":"Ric"}, "content":"Hello", "createdAt":"2025-11-05T12:00:00Z", "likeCount":2 }
  ],
  "nextCursor": "<base64>"
}
```

- `POST /api/posts` body:
```json
{ "content": "這是一則測試，包含 http://example.com 連結 #tag @someone" }
```

## 17. 其他細節與注意事項
- **同一 email 不合併**：照需求，同一人使用不同 OAuth providers 應該擁有不同 userIds。
- **Repost**：視為新的 Post（`isRepost=true` 與 `repostOfId`），但不允許原始 repost 刪除（只能刪除自己原始發文）。
- **Likes 私有顯示**：個人頁的 `Likes` tab 僅給當前 user 本人查看（others 不可見）
- **Recursive comments**：API 可遞迴讀取 depth-limited（避免一次性取大量層級），並支援分頁。
---