# 測試文檔

本資料夾包含 X-like App 的所有測試腳本與文檔。

## 測試網址

https://xlikeapp.vercel.app

目前新用戶的OAuth在某些使用者底下會有redirect的問題，與權限設定或防火牆有關，提供走後門的測試用選項

## 測試用帳號資訊

| Option | ID         | Name       |
|--------|------------|------------|
| 1      | testuser   | Test User  |
| 2      | testuser1  | Test User1 |
| 3      | testuser2  | Test User2 |
| 4      | userA      | User A     |
| 5      | userB      | User B     |
| 6      | userC      | User C     |

## 請在Explore Follow以下管理者
@test1
@test2
會持續優化並處理OAuth的相關問題，並更新測試影片連結供參考，若沒有問題UserA, B, C會模擬三位名人的twitter，敬請期待

## 應用程式功能概述

### 認證與註冊

- **OAuth 登入**：支援 GitHub 和 Google OAuth 登入
  - 新用戶會自動生成臨時 User ID 並創建帳戶
  - 首次登入後會引導至個人資料編輯頁面設置正式 User ID
- **測試登入**：提供後門測試登入機制，使用 User ID 和 Name 驗證

### 發文功能

- **發文**：支援最多 280 字元的文字內容
- **內容解析**：
  - URL 自動識別並轉換為可點擊連結（每個 URL 固定計為 23 字元）
  - Hashtag（`#hashtag`）顯示為藍色，不計入字元數
  - Mention（`@userID`）顯示為藍色，點擊跳轉到用戶個人頁面，不計入字元數
- **文章管理**：編輯和刪除自己的文章

### 互動功能

- **按讚（Like）**：對文章按讚或取消按讚
- **轉發（Repost）**：轉發文章到自己的個人頁面
- **留言（Comment）**：支援多層留言回覆，形成樹狀結構

### 關注系統

- **關注/取消關注**：關注其他用戶或取消關注
- **Feed 過濾**：
  - **All 標籤**：顯示自己的文章和所有關注用戶的文章
  - **Following 標籤**：只顯示關注用戶的文章

### 通知系統

- **通知類型**：Follow、Like、Comment、Repost、Post 通知
- **即時通知**：當關注的用戶發文時，會在所有路由顯示 Toast 通知
- **通知管理**：查看通知列表，標記為已讀

### 聊天功能

- **互相關注聊天**：只有互相關注的用戶才能互相發送訊息
- **即時訊息**：使用 Pusher 實現即時訊息傳送
- **訊息內容**：支援純文字和超連結

### 草稿管理

- **保存草稿**：在發文編輯器中保存未完成的文章
- **草稿列表**：查看、編輯、刪除所有草稿

### 個人資料

- **查看個人資料**：查看自己的或其他用戶的個人頁面
- **編輯個人資料**：修改 User ID、Name、Bio、頭像、背景圖片
- **個人頁面標籤**：Posts、Reposts、Likes、Followers、Following

### 即時更新

使用 Pusher 實現即時更新功能，包括：
- 文章按讚數、留言數、轉發數即時更新
- 新文章通知（Toast 通知）
- 聊天訊息即時傳送
- 關注者數量即時更新

### 內容限制與規則

- **字元數限制**：文章和留言最多 280 字元
- **User ID 規則**：必須唯一，新註冊時為小寫字母和數字，最多 20 個字元
- **權限控制**：只有作者可以編輯或刪除自己的內容

## 測試結構

```
test/
├── e2e/          # Playwright E2E 測試
├── unit/         # Vitest 單元測試
└── scripts/      # 手動測試腳本
```

## 環境設置

### 前置需求

1. 確保 `.env.local` 已設置並包含：
   - `LOCAL_AUTH=true` (本地開發模式)
   - `DATABASE_URL` (MongoDB 連接字串)
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_PUSHER_KEY` 和 `NEXT_PUBLIC_PUSHER_CLUSTER` (可選，用於即時功能測試)

2. 確保資料庫已初始化：
   ```bash
   npm run db:generate
   npm run db:push
   ```

## E2E 測試 (Playwright)

### 安裝 Playwright 瀏覽器

```bash
npx playwright install
```

### 執行測試

在 VSCode/Cursor terminal 中執行：

```bash
# 執行所有 E2E 測試
npm run test:e2e

# 執行特定測試檔案
npm run test:e2e -- auth.spec.ts

# 使用 UI 模式執行測試
npm run test:e2e:ui
```

### 測試項目

- `auth.spec.ts` - 認證流程測試（OAuth 與 LOCAL_AUTH）
- `posts.spec.ts` - 發文/按讚/留言/轉發完整流程測試
- `realtime.spec.ts` - Pusher 即時更新測試（多用戶同時操作）
- `profile.spec.ts` - 個人頁面與追蹤功能測試

## 單元測試 (Vitest)

### 執行測試

```bash
# 執行所有單元測試
npm test

# 監聽模式
npm test -- --watch

# 執行特定測試檔案
npm test -- content-parser.test.ts
```

### 測試項目

- `content-parser.test.ts` - 內容解析測試（hashtag/mention/link）
- `character-count.test.ts` - 字元計數邏輯測試（URL 23 字元規則）
- `api-helpers.test.ts` - API 工具函數測試

## 手動測試腳本

### 資料庫種子腳本

建立測試資料：

```bash
# 使用 Node.js 執行
node test/scripts/seed-db.ts

# 或使用 tsx (如果已安裝)
tsx test/scripts/seed-db.ts
```

### API 測試腳本

測試 API 端點（Windows PowerShell）：

```powershell
# 執行 API 測試腳本
.\test\scripts\test-api.ps1
```

測試項目包括：
- 認證 API
- 使用者 API
- 文章 API
- 留言 API
- 按讚 API
- 追蹤 API
- 草稿 API

## 本地開發測試流程

1. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

2. **在另一個 terminal 執行測試**：
   ```bash
   # E2E 測試
   npm run test:e2e

   # 單元測試
   npm test
   ```

3. **檢查測試結果**：
   - E2E 測試會在瀏覽器中自動執行
   - 單元測試會在 terminal 顯示結果

## 注意事項

- 確保在執行測試前，開發伺服器已啟動（`npm run dev`）
- E2E 測試需要瀏覽器環境，確保已安裝 Playwright 瀏覽器
- 測試會使用測試資料庫，不會影響生產資料
- 如果測試失敗，檢查 `.env.local` 配置是否正確











