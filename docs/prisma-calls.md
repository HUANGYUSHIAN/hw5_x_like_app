# Prisma 調用位置文檔

本文檔列出所有 Prisma 資料庫調用的位置，幫助理解哪些操作會觸發資料庫查詢。

## 用戶相關 (User)

### 創建/查找用戶
- **`src/app/api/auth/local/route.ts`** (POST)
  - `prisma.user.findUnique()` - 查找現有用戶
  - `prisma.user.create()` - 創建新用戶
  - `prisma.user.update()` - 更新用戶名稱

- **`src/lib/local-auth.ts`**
  - `prisma.user.findUnique()` - 驗證 token 時查找用戶
  - `prisma.user.findUnique()` - 創建 token 時查找用戶

- **`src/lib/auth.ts`**
  - `prisma.user.findUnique()` - 從 NextAuth token 獲取用戶資料

- **`src/app/api/auth/session/route.ts`** (GET)
  - `prisma.user.findUnique()` - 獲取當前 session 的用戶資料

### 用戶資料
- **`src/app/api/users/[userId]/route.ts`**
  - `prisma.user.findUnique()` - 獲取用戶資料 (GET)
  - `prisma.user.update()` - 更新用戶資料 (PATCH)

### 關注關係
- **`src/app/api/users/[userId]/follow/route.ts`** (POST)
  - `prisma.follow.findFirst()` - 檢查是否已關注
  - `prisma.follow.create()` - 創建關注關係
  - `prisma.follow.delete()` - 取消關注

- **`src/app/api/users/[userId]/followers/route.ts`** (GET)
  - `prisma.follow.findMany()` - 獲取關注者列表

- **`src/app/api/users/[userId]/following/route.ts`** (GET)
  - `prisma.follow.findMany()` - 獲取正在關注的用戶列表

## 文章相關 (Post)

### 獲取文章
- **`src/app/api/posts/route.ts`** (GET)
  - `prisma.follow.findMany()` - 獲取關注的用戶列表（當 filter=following）
  - `prisma.post.findMany()` - 獲取文章列表（**這是首頁載入時的主要查詢**）
    - 包含 `author`, `_count`, `likes` 等關聯資料

- **`src/app/api/posts/[postId]/route.ts`** (GET)
  - `prisma.post.findUnique()` - 獲取單篇文章
  - 包含 `author`, `likes`, `comments`, `_count` 等關聯資料

### 創建/更新/刪除文章
- **`src/app/api/posts/route.ts`** (POST)
  - `prisma.user.findUnique()` - 驗證用戶存在
  - `prisma.post.create()` - 創建新文章
  - 觸發 Pusher `post:created` 事件

- **`src/app/api/posts/[postId]/route.ts`** (PATCH)
  - `prisma.post.findUnique()` - 查找文章
  - `prisma.post.update()` - 更新文章
  - 觸發 Pusher `post:updated` 事件

- **`src/app/api/posts/[postId]/route.ts`** (DELETE)
  - `prisma.post.findUnique()` - 查找文章
  - `prisma.post.delete()` - 刪除文章
  - 觸發 Pusher `post:deleted` 事件

### 點讚
- **`src/app/api/posts/[postId]/like/route.ts`** (POST)
  - `prisma.like.findFirst()` - 檢查是否已點讚
  - `prisma.like.create()` - 創建點讚
  - `prisma.like.delete()` - 取消點讚
  - 觸發 Pusher `post:liked` 事件

### 評論
- **`src/app/api/posts/[postId]/comments/route.ts`** (GET)
  - `prisma.comment.findMany()` - 獲取評論列表

- **`src/app/api/posts/[postId]/comments/route.ts`** (POST)
  - `prisma.comment.create()` - 創建評論
  - 觸發 Pusher `post:commented` 事件

## 草稿相關 (Draft)

- **`src/app/api/drafts/route.ts`** (GET)
  - `prisma.draft.findMany()` - 獲取草稿列表

- **`src/app/api/drafts/route.ts`** (POST/PUT)
  - `prisma.draft.upsert()` - 創建或更新草稿

- **`src/app/api/drafts/[draftId]/route.ts`** (DELETE)
  - `prisma.draft.delete()` - 刪除草稿

## 首頁載入流程

當用戶訪問首頁 (`src/app/page.tsx`) 時：

1. **客戶端載入** (`src/app/page.tsx`)
   - `useEffect` 觸發 `fetchPosts()`
   - 調用 `/api/posts?filter=all&limit=20`

2. **API 路由** (`src/app/api/posts/route.ts` GET)
   - 調用 `getSession(request)` 獲取當前用戶
   - 如果 `filter=following`，調用 `prisma.follow.findMany()` 獲取關注列表
   - **調用 `prisma.post.findMany()` 獲取文章** ← **這裡可能卡住**
     - 包含 `author` (用戶資料)
     - 包含 `_count` (點讚、評論、轉發數量)
     - 包含 `likes` (當前用戶是否點讚)
   - 返回文章列表

3. **如果 MongoDB 連接有問題**：
   - `prisma.post.findMany()` 會超時或失敗
   - 導致首頁一直顯示 Loading
   - 錯誤會記錄在伺服器日誌中

## 常見問題

### 為什麼首頁一直 Loading？

可能原因：
1. **MongoDB 連接超時** - 檢查 `DATABASE_URL` 和 MongoDB Atlas 設置
2. **`prisma.post.findMany()` 查詢太慢** - 檢查資料庫索引
3. **網路問題** - 檢查網路連接
4. **Session 獲取失敗** - 檢查認證 cookie

### 如何調試？

1. **檢查伺服器日誌**：
   ```bash
   # 查看 Next.js 開發伺服器輸出
   npm run dev
   ```

2. **檢查資料庫連接**：
   ```bash
   npm run check-db
   ```

3. **檢查 API 端點**：
   ```bash
   # 測試 posts API
   curl http://localhost:3000/api/posts?limit=5
   ```

4. **使用 Prisma Studio**：
   ```bash
   npm run db:studio
   ```

## 性能優化建議

1. **添加索引**：
   - `Post.createdAt` - 已添加
   - `Post.authorId` - 已添加
   - `Follow.followerId` - 建議添加
   - `Follow.followingId` - 建議添加

2. **分頁查詢**：
   - 使用 cursor-based pagination
   - 限制每次查詢的數量

3. **緩存策略**：
   - 考慮使用 Redis 緩存熱門文章
   - 使用 Next.js 的 `revalidate` 選項

4. **連接池**：
   - Prisma 自動管理連接池
   - 確保 MongoDB 連接字串包含適當的參數

---

**最後更新：** 2024年（開發階段）








