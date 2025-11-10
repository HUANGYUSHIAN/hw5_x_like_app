# 本地開發環境設置指南

## MongoDB 設置選項

在本地開發中，MongoDB 是必須的（Prisma 需要資料庫連接）。以下是幾個輕量選項：

### 選項 1: MongoDB Atlas（推薦 - 最簡單）

MongoDB Atlas 提供免費層（M0），無需本地安裝，最適合快速開始。

#### 步驟：

1. **註冊 MongoDB Atlas 帳號**
   - 訪問 https://www.mongodb.com/cloud/atlas/register
   - 使用 Google/GitHub 帳號快速註冊

2. **建立免費叢集**
   - 選擇免費層（M0）
   - 選擇區域（建議選擇離你最近的）
   - 建立叢集（約 3-5 分鐘）

3. **設置資料庫存取**
   - 在 "Database Access" 中建立使用者
   - 設定密碼（記住這個密碼）

4. **設置網路存取**
   - 在 "Network Access" 中點擊 "Add IP Address"
   - 選擇 "Allow Access from Anywhere" (0.0.0.0/0) 用於開發
   - 或添加你的 IP 地址

5. **取得連接字串**
   - 在 "Database" 中點擊 "Connect"
   - 選擇 "Connect your application"
   - 複製連接字串
   - 將 `<password>` 替換為你設定的密碼

6. **更新 .env.local**
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/x_like_app?retryWrites=true&w=majority"
   ```

**優點**：
- ✅ 無需本地安裝
- ✅ 免費層足夠開發使用
- ✅ 自動備份
- ✅ 可從任何地方存取

**缺點**：
- ⚠️ 需要網路連接
- ⚠️ 免費層有資源限制（512MB）

---

### 選項 2: Docker（推薦 - 本地開發）

如果你有 Docker，這是最輕量的本地選項。

#### 步驟：

1. **建立 docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     mongodb:
       image: mongo:7
       container_name: x_like_mongodb
       ports:
         - "27017:27017"
       environment:
         MONGO_INITDB_DATABASE: x_like_app
       volumes:
         - mongodb_data:/data/db
   
   volumes:
     mongodb_data:
   ```

2. **啟動 MongoDB**
   ```bash
   docker-compose up -d
   ```

3. **更新 .env.local**
   ```env
   DATABASE_URL="mongodb://localhost:27017/x_like_app"
   ```

4. **停止 MongoDB（需要時）**
   ```bash
   docker-compose down
   ```

**優點**：
- ✅ 完全本地，無需網路
- ✅ 輕量（只運行容器）
- ✅ 易於管理（docker-compose）

**缺點**：
- ⚠️ 需要安裝 Docker Desktop

---

### 選項 3: 本地安裝 MongoDB Community Edition

適合不想使用 Docker 或雲端服務的情況。

#### Windows 安裝步驟：

1. **下載 MongoDB Community Server**
   - 訪問 https://www.mongodb.com/try/download/community
   - 選擇 Windows 版本
   - 下載 MSI 安裝檔

2. **安裝**
   - 執行安裝檔
   - 選擇 "Complete" 安裝
   - 選擇 "Install MongoDB as a Service"
   - 記住安裝路徑（預設：`C:\Program Files\MongoDB\Server\7.0\bin`）

3. **驗證安裝**
   ```powershell
   mongod --version
   ```

4. **啟動 MongoDB 服務**
   - MongoDB 會自動作為 Windows 服務運行
   - 或在 PowerShell 中執行：
   ```powershell
   net start MongoDB
   ```

5. **更新 .env.local**
   ```env
   DATABASE_URL="mongodb://localhost:27017/x_like_app"
   ```

**優點**：
- ✅ 完全本地控制
- ✅ 無需 Docker

**缺點**：
- ⚠️ 需要下載安裝（約 200MB）
- ⚠️ 佔用系統資源

---

## 初始化資料庫

無論使用哪種方式，完成 MongoDB 設置後：

```bash
# 生成 Prisma Client
npm run db:generate

# 同步 Schema 到資料庫
npm run db:push

# (可選) 開啟 Prisma Studio 查看資料
npm run db:studio
```

## 驗證連接

建立一個簡單的測試腳本 `test-connection.ts`：

```typescript
import { prisma } from './src/lib/prisma'

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ MongoDB 連接成功！')
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ MongoDB 連接失敗：', error)
    process.exit(1)
  }
}

testConnection()
```

執行：
```bash
npx tsx test-connection.ts
```

## 推薦方案

- **快速開始**：使用 MongoDB Atlas（選項 1）
- **本地開發**：使用 Docker（選項 2）
- **生產環境**：使用 MongoDB Atlas 或自託管 MongoDB

## 常見問題

### Q: 我可以跳過資料庫設置嗎？
A: 不行，Prisma 需要資料庫連接才能運行。但你可以使用 MongoDB Atlas 免費層，無需本地安裝。

### Q: Docker 會佔用很多資源嗎？
A: MongoDB Docker 容器約使用 200-300MB 記憶體，對現代電腦來說很輕量。

### Q: 我可以使用 SQLite 嗎？
A: 可以，但需要修改 Prisma schema（將 `provider = "mongodb"` 改為 `provider = "sqlite"`），且需要調整所有模型定義。不建議，因為生產環境使用 MongoDB。

### Q: 如何清理測試資料？
A: 使用 Prisma Studio (`npm run db:studio`) 或直接刪除資料庫並重新執行 `npm run db:push`。










