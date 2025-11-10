# Google OAuth 配置指南

## 错误：redirect_uri_mismatch

**错误信息：**
```
错误 400：redirect_uri_mismatch
redirect_uri=http://localhost:3000/api/auth/callback/google
```

**原因：** Google Cloud Console 中没有配置正确的回调 URL。

---

## 详细配置步骤

### 1. 访问 Google Cloud Console

1. 打开浏览器，访问：https://console.cloud.google.com/apis/credentials
2. 确保选择了正确的项目（你的 OAuth 应用所在的项目）

### 2. 找到你的 OAuth 2.0 客户端 ID

1. 在 "凭据" 页面，找到 "OAuth 2.0 客户端 ID" 部分
2. 找到你的客户端 ID（应该与 `.env` 文件中的 `GOOGLE_CLIENT_ID` 匹配）
3. 点击该客户端 ID 的名称或右侧的 **编辑** 图标（铅笔图标）

### 3. 配置已授权的重定向 URI

在编辑页面中，找到 **"已授权的重定向 URI"** 部分：

1. 点击 **"+ 添加 URI"** 按钮
2. 输入以下 URL（**必须完全匹配，包括协议、域名、端口和路径**）：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
3. 点击 **"添加"** 或按 Enter

**⚠️ 重要注意事项：**
- URL 必须**完全匹配**，包括：
  - 协议：`http://`（不是 `https://`）
  - 域名：`localhost`（不是 `127.0.0.1`）
  - 端口：`:3000`
  - 路径：`/api/auth/callback/google`
- **不能有尾部斜杠**（`/`）
- **不能有多余的空格**

### 4. 配置已授权的 JavaScript 来源

在同一个编辑页面，找到 **"已授权的 JavaScript 来源"** 部分：

1. 点击 **"+ 添加 URI"** 按钮
2. 输入：
   ```
   http://localhost:3000
   ```
3. 点击 **"添加"** 或按 Enter

**⚠️ 重要注意事项：**
- 只需要域名和端口，**不需要路径**
- 不能有尾部斜杠

### 5. 保存更改

1. 滚动到页面底部
2. 点击 **"保存"** 按钮
3. 等待几秒钟让更改生效（通常需要 1-5 分钟）

### 6. 验证配置

保存后，你应该能在列表中看到：
- **已授权的重定向 URI：**
  - `http://localhost:3000/api/auth/callback/google`
- **已授权的 JavaScript 来源：**
  - `http://localhost:3000`

---

## 常见错误

### ❌ 错误 1：使用 https:// 而不是 http://
```
https://localhost:3000/api/auth/callback/google  ❌
http://localhost:3000/api/auth/callback/google   ✅
```

### ❌ 错误 2：使用 127.0.0.1 而不是 localhost
```
http://127.0.0.1:3000/api/auth/callback/google  ❌
http://localhost:3000/api/auth/callback/google ✅
```

### ❌ 错误 3：缺少端口号
```
http://localhost/api/auth/callback/google  ❌
http://localhost:3000/api/auth/callback/google ✅
```

### ❌ 错误 4：路径错误
```
http://localhost:3000/auth/callback/google  ❌
http://localhost:3000/api/auth/callback/google  ❌
http://localhost:3000/api/auth/callback/google   ✅
```

### ❌ 错误 5：有尾部斜杠
```
http://localhost:3000/api/auth/callback/google/  ❌
http://localhost:3000/api/auth/callback/google   ✅
```

### ❌ 错误 6：在 JavaScript 来源中添加了路径
```
http://localhost:3000/api/auth/callback/google  ❌ (JavaScript 来源)
http://localhost:3000                           ✅ (JavaScript 来源)
```

---

## 验证步骤

配置完成后，按以下步骤验证：

1. **重启开发服务器**（如果正在运行）：
   ```bash
   # 停止当前服务器 (Ctrl+C)
   npm run dev
   ```

2. **查看控制台输出**：
   启动后，应该看到：
   ```
   ✓ Google Provider 已添加
   📋 Google 回调 URL: http://localhost:3000/api/auth/callback/google
   ⚠️  请确保 Google Cloud Console 中配置了此回调 URL
   ```

3. **尝试登录**：
   - 访问 http://localhost:3000/auth/signin
   - 点击 "使用 Google 登入"
   - 应该能正常跳转到 Google 登录页面，而不是显示 `redirect_uri_mismatch` 错误

---

## 如果仍然出现错误

### 1. 检查 .env 文件
确保 `.env` 文件中有：
```env
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. 验证 Client ID 和 Secret
运行诊断脚本：
```bash
npm run check_OAuth_Google
```

### 3. 清除浏览器缓存
- 清除浏览器缓存和 Cookie
- 或使用隐私模式（无痕模式）测试

### 4. 等待配置生效
Google Cloud Console 的更改可能需要几分钟才能生效。如果立即测试失败，等待 2-5 分钟后重试。

### 5. 检查项目设置
确保：
- 在 Google Cloud Console 中选择了正确的项目
- OAuth 同意屏幕已正确配置
- 应用类型设置为 "Web 应用程序"

---

## 参考链接

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2/web-server?hl=zh-tw#authorization-errors-redirect-uri-mismatch)
- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)



