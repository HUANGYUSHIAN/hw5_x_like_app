# 測試文檔

本資料夾包含 X-like App 的所有測試腳本與文檔。

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











