# 測試指南

本文檔說明如何測試應用程式的核心功能，包括登入登出、Follow 功能和 Pusher 即時更新。

## 快速開始

### 1. 確保環境設置正確

```bash
# 檢查 MongoDB 連接
npm run check-db

# 創建測試用戶
npm run create-users
```

### 2. 啟動開發伺服器

```bash
npm run dev
```

確保 `.env` 或 `.env.local` 中設置：
```env
LOCAL_AUTH=true
DATABASE_URL=your_mongodb_connection_string
```

## 自動化測試腳本

### 測試認證流程

測試登入、登出和 session 管理：

```bash
npm run test-auth-flow
```

這個腳本會：
1. ✅ 創建測試用戶（userA, userB, userC）
2. ✅ 測試登入功能
3. ✅ 測試 session 獲取
4. ✅ 測試文章獲取
5. ✅ 測試登出功能
6. ✅ 驗證 session 已清除

### 測試 Follow 和 Pusher

測試關注功能和即時更新：

```bash
npm run test-follow-pusher
```

這個腳本會：
1. ✅ 登入三個用戶（userA, userB, userC）
2. ✅ User B 和 C 關注 User A
3. ✅ User A 創建一篇文章
4. ✅ 驗證 User B 和 C 能在 following feed 中看到文章

**注意**：Pusher 的即時更新需要 WebSocket 連接，這個腳本主要測試 API 端點。完整的即時更新測試需要在瀏覽器中進行。

## 手動測試流程

### 測試登入登出

1. **訪問登入頁面**
   - 打開 `http://localhost:3000/auth/local`
   - 應該看到登入表單

2. **登入**
   - User ID: `userA`
   - Name: `User A`
   - 點擊 "Login"
   - 應該重定向到首頁，側邊欄顯示用戶資訊

3. **檢查 Session**
   - 打開瀏覽器開發者工具
   - 檢查 Cookies，應該有 `local-auth-token`
   - 檢查 Network 標籤，`/api/auth/session` 應該返回用戶資料

4. **登出**
   - 點擊側邊欄底部的用戶頭像
   - 選擇 "Logout"
   - 應該重定向到登入頁面
   - Cookies 中的 `local-auth-token` 應該被清除

### 測試 Follow 功能

1. **準備多個瀏覽器標籤**
   - 標籤 1: 登入為 `userA`
   - 標籤 2: 登入為 `userB`
   - 標籤 3: 登入為 `userC`

2. **User B 關注 User A**
   - 在標籤 2 中，訪問 `http://localhost:3000/userA`
   - 點擊 "Follow" 按鈕
   - 應該顯示 "Following"

3. **User C 關注 User A**
   - 在標籤 3 中，訪問 `http://localhost:3000/userA`
   - 點擊 "Follow" 按鈕
   - 應該顯示 "Following"

4. **驗證關注關係**
   - 在標籤 1 中，訪問 `http://localhost:3000/userA`
   - 應該看到 "2 followers"

### 測試 Pusher 即時更新

1. **設置多個標籤**
   - 標籤 1: User A 的首頁
   - 標籤 2: User B 的 "Following" feed
   - 標籤 3: User C 的 "Following" feed

2. **User A 發文**
   - 在標籤 1 中，點擊 "What's happening?"
   - 輸入內容，例如："Hello from User A!"
   - 點擊 "Post"
   - 文章應該立即出現在標籤 1 的首頁

3. **驗證即時更新**
   - 標籤 2 和 3 應該在幾秒內自動顯示新文章
   - 不需要手動刷新頁面
   - 檢查瀏覽器控制台，應該看到 Pusher 連接日誌

4. **測試其他即時更新**
   - User B 點讚 User A 的文章
   - User C 應該看到點讚數更新
   - User B 評論 User A 的文章
   - User C 應該看到評論數更新

## 調試技巧

### 檢查 Prisma 調用

查看 `docs/prisma-calls.md` 了解所有 Prisma 調用的位置。

### 常見問題

#### 1. 首頁一直 Loading

**原因**：`prisma.post.findMany()` 查詢失敗或超時

**解決方法**：
```bash
# 檢查資料庫連接
npm run check-db

# 檢查 API 端點
curl http://localhost:3000/api/posts?limit=5

# 查看伺服器日誌
# 在運行 npm run dev 的終端中查看錯誤訊息
```

#### 2. 登出後仍顯示已登入

**原因**：客戶端 session 緩存未清除

**解決方法**：
- 清除瀏覽器 Cookies
- 硬刷新頁面（Ctrl+Shift+R 或 Cmd+Shift+R）
- 檢查 `local-auth-token` cookie 是否被清除

#### 3. Pusher 即時更新不工作

**原因**：Pusher 配置錯誤或 WebSocket 連接失敗

**解決方法**：
- 檢查 `.env` 中的 Pusher 配置
- 檢查瀏覽器控制台的 WebSocket 錯誤
- 確認 Pusher 服務正常運行

#### 4. Follow 功能不工作

**原因**：API 端點錯誤或資料庫問題

**解決方法**：
```bash
# 使用測試腳本驗證
npm run test-follow-pusher

# 檢查資料庫中的 Follow 記錄
npm run db:studio
# 查看 "follows" 集合
```

## 測試檢查清單

### 認證功能
- [ ] 可以登入
- [ ] Session 正確保存
- [ ] 可以登出
- [ ] 登出後 session 被清除
- [ ] 未登入時重定向到登入頁

### Follow 功能
- [ ] 可以關注用戶
- [ ] 可以取消關注
- [ ] Following feed 只顯示關注用戶的文章
- [ ] 關注數和粉絲數正確顯示

### Pusher 即時更新
- [ ] 新文章即時出現在所有相關 feed
- [ ] 點讚數即時更新
- [ ] 評論數即時更新
- [ ] 多個標籤同步更新

### 文章功能
- [ ] 可以創建文章
- [ ] 可以編輯自己的文章
- [ ] 可以刪除自己的文章
- [ ] 可以點讚/取消點讚
- [ ] 可以評論

## 相關文檔

- `docs/prisma-calls.md` - Prisma 調用位置文檔
- `plan/error_solve.md` - 錯誤解決記錄
- `TESTING_CHECKLIST.md` - 詳細測試檢查清單

---

**最後更新：** 2024年（開發階段）








