# 多分頁獨立登入功能

## 概述

在開發模式下，應用程式支持多分頁獨立登入功能，允許在不同瀏覽器分頁中登入不同的用戶，方便測試 Pusher 即時更新等功能。

## 工作原理

### 預設行為（Cookie 模式）

- 所有分頁共享同一個 cookie (`local-auth-token`)
- 當一個分頁登入新用戶時，所有分頁都會同步到最後登入的用戶
- 這是一般應用的正常行為

### 開發模式（LocalStorage 模式）

- 每個分頁使用獨立的 `localStorage` 存儲用戶資訊
- 每個分頁可以登入不同的用戶
- 方便測試多用戶互動和 Pusher 即時更新

## 啟用方式

### 自動啟用（預設）

在開發模式下（`NODE_ENV=development`），localStorage 模式會自動啟用。

### 手動控制

在 `.env.local` 中設置：

```env
# 啟用 localStorage 模式（開發模式預設啟用）
NEXT_PUBLIC_USE_LOCAL_STORAGE=true

# 禁用 localStorage 模式（使用 cookie 模式）
NEXT_PUBLIC_USE_LOCAL_STORAGE=false
```

## 使用方式

1. **打開多個瀏覽器分頁**
2. **在不同分頁登入不同用戶**：
   - 分頁 1：登入 User A
   - 分頁 2：登入 User B
   - 分頁 3：登入 User C
3. **測試功能**：
   - User A 發文
   - User B 和 C（如果 follow 了 A）應該能收到即時更新
   - 每個分頁保持獨立的用戶狀態

## 技術實現

### 文件結構

- `src/lib/local-session-storage.ts` - localStorage 存儲工具
- `src/components/providers/SessionProvider.tsx` - 自定義 Session Provider
- `src/app/auth/local/page.tsx` - 登入頁面（支持 localStorage）

### 關鍵功能

1. **SessionProvider**：
   - 檢測是否使用 localStorage 模式
   - 從 localStorage 讀取用戶資訊
   - 監聽 storage 事件（當其他分頁登入/登出時）

2. **登入流程**：
   - 登入成功後，將用戶資訊保存到 localStorage
   - 每個分頁的 localStorage 是獨立的

3. **登出流程**：
   - 清除 localStorage 中的用戶資訊
   - 重定向到登入頁面

## 注意事項

1. **僅開發模式**：此功能僅在開發模式下啟用，生產環境使用標準的 cookie 認證
2. **API 調用**：API 路由仍然使用 cookie 認證，但前端會從 localStorage 讀取用戶資訊
3. **跨分頁同步**：如果需要在分頁間同步，可以監聽 `storage` 事件

## 測試 Pusher

使用多分頁獨立登入功能測試 Pusher：

1. 分頁 1：登入 User A，切換到 "Following" 標籤
2. 分頁 2：登入 User B，搜尋並 follow User A
3. 分頁 3：登入 User C，搜尋並 follow User A
4. 在分頁 1（User A）發文
5. 分頁 2 和 3（User B 和 C）應該能在不刷新的情況下看到 User A 的發文

---

**最後更新：** 2024年（開發階段）







