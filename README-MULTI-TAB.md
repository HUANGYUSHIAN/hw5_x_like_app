# 多分頁獨立登入功能說明

## 問題

在開發測試時，如果打開多個瀏覽器分頁並分別登入不同用戶（User A, B, C），所有分頁會同步到最後登入的用戶。這是因為所有分頁共享同一個 cookie (`local-auth-token`)。

## 解決方案

在開發模式下，應用程式現在支持使用 `localStorage` 來存儲用戶資訊，讓每個分頁可以獨立登入不同的用戶。

## 啟用方式

### 自動啟用（預設）

在開發模式下（`npm run dev`），localStorage 模式會**自動啟用**。

### 手動控制

如果需要禁用，在 `.env.local` 中設置：

```env
NEXT_PUBLIC_USE_LOCAL_STORAGE=false
```

## 使用方式

1. **打開多個瀏覽器分頁**
2. **在不同分頁登入不同用戶**：
   - 分頁 1：訪問 `http://localhost:3000/auth/local`，登入 User A
   - 分頁 2：訪問 `http://localhost:3000/auth/local`，登入 User B
   - 分頁 3：訪問 `http://localhost:3000/auth/local`，登入 User C
3. **每個分頁會保持獨立的用戶狀態**
4. **測試 Pusher 即時更新**：
   - 分頁 1（User A）：發文
   - 分頁 2 和 3（User B 和 C，如果 follow 了 A）：應該能在不刷新的情況下看到 User A 的發文

## 技術細節

- **前端**：使用 `localStorage` 存儲用戶資訊（每個分頁獨立）
- **API 認證**：通過 `X-User-Id` 和 `X-User-UserId` header 傳遞用戶資訊
- **後端**：API 路由會檢查 header，如果存在則使用 header 中的用戶資訊，否則使用 cookie

## 注意事項

1. **僅開發模式**：此功能僅在開發模式下啟用，生產環境使用標準的 cookie 認證
2. **API 調用**：所有 API 調用都會自動添加用戶資訊到 header（如果在 localStorage 模式下）
3. **登出**：登出會清除當前分頁的 localStorage，不影響其他分頁

---

**最後更新：** 2024年（開發階段）







