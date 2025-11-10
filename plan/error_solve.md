# 錯誤解決記錄

本文檔記錄了開發過程中遇到的所有錯誤及其解決方案。

## 目錄

1. [NextAuth v5 Beta 相關錯誤](#nextauth-v5-beta-相關錯誤)
2. [Prisma 引擎相關錯誤](#prisma-引擎相關錯誤)
3. [本地認證登入問題](#本地認證登入問題)
4. [Middleware 和 Edge Runtime 問題](#middleware-和-edge-runtime-問題)

---

## NextAuth v5 Beta 相關錯誤

### 錯誤 1: `getServerSession is not a function`

**錯誤訊息：**
```
TypeError: (0 , next_auth__WEBPACK_IMPORTED_MODULE_0__.getServerSession) is not a function
```

**原因：**
- NextAuth v5 beta 中 `getServerSession` 已被移除
- 需要使用 `getToken` 從 JWT 中獲取 session 資訊

**解決方案：**
1. 更新 `src/app/api/auth/session/route.ts`：
   - 使用 `getToken` 替代 `getServerSession`
   - 從資料庫查詢用戶資訊以構建完整的 session 物件

2. 更新 `src/lib/auth.ts`：
   - `getSession()` 和 `requireAuth()` 改用 `getToken`
   - 函數現在需要 `request` 參數來獲取 cookies

3. 更新所有 API 路由：
   - 所有 `requireAuth()` 和 `getSession()` 調用都需要傳遞 `request` 參數

**相關文件：**
- `src/app/api/auth/session/route.ts`
- `src/lib/auth.ts`
- 所有 `src/app/api/**/route.ts` 文件

---

### 錯誤 2: NextAuth Handler 導出錯誤

**錯誤訊息：**
```
TypeError: Function.prototype.apply was called on #<Object>, which is an object and not a function
GET /api/auth/providers 500
GET /api/auth/error 500
```

**原因：**
- NextAuth v5 beta 的 handler 導出方式與 v4 不同
- 當 `LOCAL_AUTH=true` 時，不應該初始化 NextAuth handler

**解決方案：**
1. 更新 `src/app/api/auth/[...nextauth]/route.ts`：
   - 當 `LOCAL_AUTH=true` 時，不初始化 NextAuth handler
   - 返回 404 錯誤而不是嘗試使用 handler

2. 創建獨立的本地認證系統：
   - 創建 `src/lib/local-auth.ts` 使用 JWT 和 cookie
   - 當 `LOCAL_AUTH=true` 時完全繞過 NextAuth

**相關文件：**
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/lib/local-auth.ts`
- `src/app/api/auth/local/route.ts`

---

## Prisma 引擎相關錯誤

### 錯誤 3: Prisma WASM 引擎找不到

**錯誤訊息：**
```
Module not found: Can't resolve './query_engine_bg.js'
./node_modules/.prisma/client/wasm.js (219:1)
```

**原因：**
- Prisma 嘗試使用 WASM 引擎，但文件不存在
- Next.js webpack 配置需要排除 WASM 文件
- Middleware 在 Edge Runtime 中運行，不應導入 Prisma

**解決方案：**
1. 更新 `next.config.ts`：
   ```typescript
   webpack: (config, { isServer }) => {
     if (!isServer) {
       config.resolve.fallback = {
         ...config.resolve.fallback,
         fs: false,
         net: false,
         tls: false,
         child_process: false,
         '@prisma/client': false,
         '.prisma/client': false,
       }
     }
     config.ignoreWarnings = [
       ...(config.ignoreWarnings || []),
       { module: /\.prisma\/client\/wasm\.js$/ },
       { module: /query_engine_bg\.js$/ },
       { module: /query_engine_bg\.wasm$/ },
     ]
     return config
   }
   ```

2. 更新 `src/middleware.ts`：
   - 移除 `getLocalAuthSession` 的導入（它會導入 Prisma）
   - 直接檢查 cookie，避免在 middleware 中導入 Prisma

3. 更新 `src/lib/local-auth.ts`：
   - 使用 lazy loading 延遲導入 Prisma

**相關文件：**
- `next.config.ts`
- `src/middleware.ts`
- `src/lib/local-auth.ts`

---

### 錯誤 4: Prisma 引擎兼容性問題

**錯誤訊息：**
```
Invalid `prisma.user.findUnique()` invocation:
Unable to require(`1`).
The Prisma engines do not seem to be compatible with your system.
Details: The specified module could not be found.
\\?\C:\Users\huang\Desktop\x_like_app\1
```

**原因：**
- 錯誤的環境變數設置導致 Prisma 嘗試 `require('1')`
- Prisma 客戶端沒有正確生成
- 缺少 `@prisma/engines` 依賴

**解決方案：**
1. 移除錯誤的環境變數設置：
   - 從 `src/lib/prisma.ts` 中移除 `process.env.PRISMA_QUERY_ENGINE_LIBRARY = '1'`

2. 重新安裝 Prisma：
   ```bash
   npm install prisma @prisma/client --save
   ```

3. 清理並重新生成 Prisma 客戶端：
   ```bash
   Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules\@prisma -ErrorAction SilentlyContinue
   npm run db:generate
   ```

4. 確保 Prisma schema 使用標準配置：
   ```prisma
   generator client {
     provider = "prisma-client-js"
     previewFeatures = []
   }
   ```

**相關文件：**
- `src/lib/prisma.ts`
- `prisma/schema.prisma`
- `package.json`

---

## 本地認證登入問題

### 錯誤 5: 登入 API 500 錯誤

**錯誤訊息：**
```
POST /api/auth/local 500
Local auth error: [PrismaClientInitializationError]
```

**原因：**
- 輸入驗證不足（空格處理）
- 錯誤處理不夠詳細
- Prisma 引擎問題

**解決方案：**
1. 改進輸入處理 (`src/app/api/auth/local/route.ts`)：
   ```typescript
   // Trim whitespace from inputs
   userId = userId?.trim()
   name = name?.trim()
   
   // Validate userId (no spaces allowed)
   if (userId.includes(' ')) {
     return NextResponse.json({ 
       error: 'User ID cannot contain spaces. Please use a single word without spaces.' 
     }, { status: 400 })
   }
   ```

2. 改進錯誤處理：
   - 提供更詳細的錯誤訊息
   - 區分不同類型的錯誤（驗證錯誤、資料庫錯誤等）
   - 在開發模式下顯示錯誤詳情

3. 前端驗證 (`src/app/auth/local/page.tsx`)：
   - 在客戶端也進行驗證
   - 提供即時錯誤提示

**重要提示：**
- **User ID** 必須是單一詞彙，不能包含空格（例如：`userA`）
- **Name** 可以有空格，但前後空格會被自動移除（例如：`User A`）

**相關文件：**
- `src/app/api/auth/local/route.ts`
- `src/app/auth/local/page.tsx`

---

## MongoDB 連接問題

### 錯誤 6: MongoDB Atlas 連接超時

**錯誤訊息：**
```
Invalid `prisma.user.findUnique()` invocation:
Raw query failed. Code: `unknown`. Message: `Kind: Server selection timeout: No available servers. 
Topology: { Type: ReplicaSetNoPrimary, Set Name: atlas-xxx-shard-0, 
Servers: [ { Address: xxx.mongodb.net:27017, Type: Unknown, Error: Kind: I/O error: timed out } ] }`
```

**原因：**
- MongoDB Atlas 連接超時
- 網路連接問題
- MongoDB Atlas IP 白名單未正確設置
- 連接字串缺少超時參數
- MongoDB Atlas 集群狀態異常

**解決方案：**

1. **檢查 MongoDB Atlas 設置：**
   - 登入 MongoDB Atlas 控制台
   - 檢查 "Network Access" 中的 IP 白名單
   - 確保你的 IP 地址已加入白名單（或使用 `0.0.0.0/0` 允許所有 IP，僅用於開發）
   - 檢查集群狀態是否正常運行

2. **更新連接字串：**
   在 `.env` 文件中，確保 `DATABASE_URL` 包含超時參數：
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/x_like_app?retryWrites=true&w=majority&serverSelectionTimeoutMS=10000&connectTimeoutMS=10000"
   ```
   
   參數說明：
   - `serverSelectionTimeoutMS=10000`: 服務器選擇超時（10秒）
   - `connectTimeoutMS=10000`: 連接超時（10秒）
   - `retryWrites=true`: 啟用重試寫入
   - `w=majority`: 寫入確認模式

3. **改進錯誤處理：**
   更新 `src/app/api/auth/local/route.ts` 以區分連接錯誤：
   ```typescript
   // Handle MongoDB connection errors
   else if (error?.message?.includes('Server selection timeout') || 
            error?.message?.includes('timed out') ||
            error?.message?.includes('I/O error')) {
     errorMessage = 'Database connection timeout. Please check your network connection and MongoDB Atlas settings.'
     statusCode = 503
   }
   ```

4. **改進 Prisma 配置：**
   在 `src/lib/prisma.ts` 中添加連接錯誤處理：
   ```typescript
   // Handle connection errors gracefully
   prisma.$connect().catch((error) => {
     if (process.env.NODE_ENV === 'development') {
       console.error('⚠️  Prisma connection error:', error)
       console.error('💡  Check your DATABASE_URL and MongoDB Atlas network access settings')
     }
   })
   ```

**常見原因檢查清單：**
- [ ] MongoDB Atlas 集群是否正在運行？
- [ ] IP 白名單是否包含你的 IP 地址？
- [ ] 連接字串中的用戶名和密碼是否正確？
- [ ] 網路連接是否正常？
- [ ] 防火牆是否阻止了連接？
- [ ] 連接字串是否包含超時參數？

**相關文件：**
- `src/lib/prisma.ts`
- `src/app/api/auth/local/route.ts`
- `.env` 或 `.env.local`
- `docs/local-setup.md`

---

## Middleware 和 Edge Runtime 問題

### 錯誤 7: Middleware 中導入 Prisma

**錯誤訊息：**
```
Module not found: Can't resolve './query_engine_bg.js'
Import trace: .../src/middleware.ts
```

**原因：**
- Middleware 在 Edge Runtime 中運行
- Edge Runtime 不支持 Node.js 原生模組（如 Prisma）
- 在 middleware 中導入 Prisma 會導致構建錯誤

**解決方案：**
1. 更新 `src/middleware.ts`：
   ```typescript
   // 不要導入 getLocalAuthSession（它會導入 Prisma）
   // 直接檢查 cookie
   if (isLocalAuth) {
     const token = request.cookies.get('local-auth-token')?.value
     if (!token) {
       return NextResponse.redirect(new URL('/auth/local', request.url))
     }
   }
   ```

2. 使用 lazy loading：
   - 在 `src/lib/local-auth.ts` 中使用動態導入
   - 只在需要時才加載 Prisma

**相關文件：**
- `src/middleware.ts`
- `src/lib/local-auth.ts`

---

## 總結

### 關鍵解決方案

1. **NextAuth v5 Beta 遷移：**
   - 使用 `getToken` 替代 `getServerSession`
   - 當 `LOCAL_AUTH=true` 時，使用獨立的本地認證系統

2. **Prisma 配置：**
   - 正確配置 webpack 以排除 WASM 文件
   - 避免在 middleware 中導入 Prisma
   - 使用 lazy loading 延遲導入 Prisma

3. **MongoDB 連接：**
   - 在連接字串中添加超時參數
   - 檢查 MongoDB Atlas IP 白名單設置
   - 改進連接錯誤處理和用戶提示

4. **本地認證：**
   - 使用 JWT 和 cookie 實現簡單的認證系統
   - 完善的輸入驗證和錯誤處理
   - 清晰的用戶提示

### 最佳實踐

1. **環境變數檢查：**
   - 始終檢查 `LOCAL_AUTH` 環境變數
   - 根據環境使用不同的認證方式

2. **錯誤處理：**
   - 提供詳細的錯誤訊息
   - 區分不同類型的錯誤
   - 在開發模式下顯示更多資訊

3. **輸入驗證：**
   - 在客戶端和服務器端都進行驗證
   - 自動 trim 空格
   - 提供清晰的驗證規則

4. **Edge Runtime 兼容性：**
   - 避免在 middleware 中使用 Node.js 原生模組
   - 使用 cookie 而不是資料庫查詢進行認證檢查

---

## 相關資源

- [NextAuth.js v5 Beta 文檔](https://authjs.dev/)
- [Prisma Next.js 指南](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Next.js Middleware 文檔](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

**最後更新：** 2024年（開發階段）
**維護者：** 開發團隊


