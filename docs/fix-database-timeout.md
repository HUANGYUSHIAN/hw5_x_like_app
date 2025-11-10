# 修復資料庫連接超時問題

## 問題診斷

如果你遇到以下錯誤：
```
Server selection timeout: No available servers
I/O error: timed out
```

這通常是 **MongoDB Atlas 連接字串缺少超時參數** 導致的。

## 解決方案

### 步驟 1: 更新 DATABASE_URL

在 `.env` 或 `.env.local` 文件中，找到 `DATABASE_URL`，確保它包含超時參數：

**原始連接字串（可能缺少參數）：**
```env
DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/x_like_app"
```

**更新後的連接字串（包含超時參數）：**
```env
DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/x_like_app?retryWrites=true&w=majority&serverSelectionTimeoutMS=10000&connectTimeoutMS=10000"
```

### 參數說明

- `retryWrites=true` - 啟用寫入重試
- `w=majority` - 寫入確認模式
- `serverSelectionTimeoutMS=10000` - 服務器選擇超時（10秒）
- `connectTimeoutMS=10000` - 連接超時（10秒）

### 步驟 2: 驗證連接

運行診斷腳本：
```bash
npm run check-db
```

應該看到：
```
✅ Connection string includes timeout parameters
✅ Connection string includes retry parameters
✅ Successfully connected to MongoDB!
```

### 步驟 3: 重新運行腳本

更新連接字串後，重新運行：
```bash
npm run create-users
```

## 其他可能的原因

如果更新連接字串後仍然超時，請檢查：

### 1. MongoDB Atlas IP 白名單

- 登入 MongoDB Atlas 控制台
- 前往 "Network Access"
- 確保你的 IP 地址已加入白名單
- 或使用 `0.0.0.0/0` 允許所有 IP（僅用於開發）

### 2. MongoDB Atlas 集群狀態

- 前往 "Clusters"
- 確認集群狀態為 "Running"
- 如果集群暫停，點擊 "Resume" 恢復

### 3. 網路連接

- 檢查網路連接是否正常
- 檢查防火牆是否阻止連接
- 嘗試從 MongoDB Atlas 網頁界面連接

### 4. 連接字串格式

確保連接字串格式正確：
- 用戶名和密碼中的特殊字符需要 URL 編碼
- 例如：`@` → `%40`, `:` → `%3A`, `/` → `%2F`

## 快速檢查清單

- [ ] DATABASE_URL 包含 `serverSelectionTimeoutMS=10000`
- [ ] DATABASE_URL 包含 `connectTimeoutMS=10000`
- [ ] DATABASE_URL 包含 `retryWrites=true&w=majority`
- [ ] MongoDB Atlas IP 白名單包含你的 IP
- [ ] MongoDB Atlas 集群狀態為 "Running"
- [ ] 網路連接正常

## 測試連接

運行以下命令測試連接：
```bash
# 診斷連接
npm run check-db

# 如果連接成功，創建測試用戶
npm run create-users
```

---

**最後更新：** 2024年（開發階段）








