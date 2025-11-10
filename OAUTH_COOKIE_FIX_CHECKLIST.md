# OAuth Cookie 设置问题检查清单

## 问题现象

从 Vercel 日志可以看到：
- `[OAuth] ✓ 登录成功 - 已存在用户` ✅ (JWT callback 成功)
- `[Middleware] No token found` ❌ (Cookie 未设置)

**问题诊断：** JWT callback 正常工作，但 session cookie 没有被正确设置。

## 已实施的修复

### 1. ✅ 添加 `trustHost: true`
```typescript
export const authOptions: NextAuthConfig = {
  trustHost: true, // NextAuth v5 在生产环境必需
  // ...
}
```

### 2. ✅ 显式配置 cookies
```typescript
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production', // 生产环境必须 true（需要 HTTPS）
    },
  },
}
```

### 3. ✅ 在 middleware 中显式指定 cookie 名称
```typescript
const token = await getToken({ 
  req: request,
  secret: process.env.NEXTAUTH_SECRET,
  cookieName: process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token',
})
```

## 必须检查的配置

### 1. Vercel 环境变量（最重要）

在 Vercel Dashboard > Settings > Environment Variables 中，**必须选择 Production 环境**，确保以下变量已设置：

```
NEXTAUTH_URL=https://xlikeapp.vercel.app
（⚠️ 不要有尾部斜杠 /）

NEXTAUTH_SECRET=<你的密钥>
（使用 openssl rand -base64 32 生成，必须与开发环境一致）

GITHUB_ID=<你的 GitHub Client ID>
GITHUB_SECRET=<你的 GitHub Client Secret>

GOOGLE_CLIENT_ID=<你的 Google Client ID>
GOOGLE_CLIENT_SECRET=<你的 Google Client Secret>
```

**重要提示：**
- 环境变量名称必须**完全匹配**（区分大小写）
- 确保选择 **Production** 环境（不是 Preview 或 Development）
- 设置后**必须重新部署**

### 2. OAuth Callback URL 配置

**Google Cloud Console:**
1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 进入 **APIs & Services** > **Credentials**
3. 选择你的 OAuth 2.0 Client ID
4. 在 **Authorized redirect URIs** 中添加：
   ```
   https://xlikeapp.vercel.app/api/auth/callback/google
   ```
   ⚠️ **必须使用固定 domain**，不要使用 `*.vercel.app` 的 redeploy URL

**GitHub Developer Settings:**
1. 打开 [GitHub Developer Settings](https://github.com/settings/developers)
2. 选择你的 OAuth App
3. 在 **Authorization callback URL** 中设置：
   ```
   https://xlikeapp.vercel.app/api/auth/callback/github
   ```
   ⚠️ **必须使用固定 domain**，不要使用 `*.vercel.app` 的 redeploy URL

### 3. HTTPS 配置

**重要：** `__Secure-*` 前缀的 cookie **必须**通过 HTTPS 传输。

Vercel 默认提供 HTTPS，但请确认：
- 访问 URL 是 `https://xlikeapp.vercel.app`（不是 `http://`）
- 浏览器地址栏显示锁图标（🔒）
- 没有混合内容警告

### 4. 浏览器 Cookie 检查

完成 OAuth 登录后，在浏览器中检查：

1. 打开浏览器开发者工具 (F12)
2. 切换到 **Application** > **Cookies** > `https://xlikeapp.vercel.app`
3. 检查是否有以下 cookie：
   - `__Secure-next-auth.session-token` (生产环境)
   - 或 `next-auth.session-token` (开发环境)

**如果没有 cookie：**
- 检查浏览器控制台是否有错误
- 检查 Network 标签页中 `/api/auth/callback/google` 的响应头
- 查看 `Set-Cookie` 响应头是否存在

**如果有 cookie 但 middleware 读取不到：**
- 检查 cookie 名称是否匹配
- 检查 cookie 的 `Secure`、`HttpOnly`、`SameSite` 属性
- 查看 middleware 日志中的 `Cookie check` 输出

## 部署后验证步骤

### 1. 部署到 Vercel
```bash
vercel --prod
```

### 2. 查看 Vercel 日志

在 Vercel Dashboard > Deployments > 最新部署 > Functions 标签页，应该能看到：

**初始化日志：**
```
[NextAuth] Cookies 配置: {
  sessionTokenName: '__Secure-next-auth.session-token',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  trustHost: true,
  note: '生产环境必须使用 HTTPS，否则 __Secure-* cookie 无法设置'
}
[NextAuth] Initializing NextAuth...
[NextAuth] Providers count: 2
```

**OAuth 登录日志：**
```
[OAuth] ✓ 登录成功 - 已存在用户: { userId: 'test1', email: '...', tokenSub: '...' }
[OAuth] Token 已设置，NextAuth 将写入 cookie: { ... }
[Redirect] Redirect callback called: { url: '/', baseUrl: 'https://xlikeapp.vercel.app' }
```

**Middleware 日志：**
```
[Middleware] Cookie check: {
  cookies: [
    { name: '__Secure-next-auth.session-token', hasValue: true/false },
    ...
  ],
  allCookies: [...]
}
[Middleware] Token check: { hasToken: true/false, ... }
```

### 3. 测试 OAuth 登录

1. 访问 `https://xlikeapp.vercel.app/auth/signin`
2. 点击 "使用 Google 登入" 或 "使用 GitHub 登入"
3. 完成 OAuth 授权
4. 检查是否成功登录（应该跳转到首页，而不是回到登录页）

### 4. 如果仍然失败

请提供以下信息：

1. **Vercel 日志中的完整输出**（特别是 `[OAuth]`、`[Redirect]`、`[Middleware]` 日志）
2. **浏览器开发者工具中的 Cookies**（截图或列表）
3. **Network 标签页中 `/api/auth/callback/google` 的响应头**（特别是 `Set-Cookie` 头）
4. **浏览器控制台中的任何错误信息**

## 常见问题排查

### 问题 1: Cookie 没有被设置

**可能原因：**
- `NEXTAUTH_SECRET` 未设置或错误
- `NEXTAUTH_URL` 有尾部斜杠或错误
- `trustHost: true` 未设置
- 未使用 HTTPS（`__Secure-*` cookie 需要 HTTPS）

**解决方案：**
- 检查 Vercel 环境变量（确保选择 Production 环境）
- 确保 `NEXTAUTH_URL` 没有尾部斜杠
- 确认 `authOptions` 中有 `trustHost: true`
- 确认访问 URL 是 `https://`（不是 `http://`）

### 问题 2: Cookie 被设置了但 middleware 读取不到

**可能原因：**
- Cookie 名称不匹配
- `getToken` 没有指定 `cookieName`
- Cookie domain 不匹配

**解决方案：**
- 查看 middleware 日志中的 `Cookie check` 输出
- 确认 cookie 名称与 `getToken` 中的 `cookieName` 匹配
- 检查 cookie 的 domain 设置（应该不设置 domain，让浏览器自动处理）

### 问题 3: Session 创建成功但立即失效

**可能原因：**
- `NEXTAUTH_SECRET` 在部署后改变
- Cookie 被浏览器安全策略阻止

**解决方案：**
- 确保 `NEXTAUTH_SECRET` 在所有环境中保持一致
- 检查浏览器的 Cookie 设置和安全策略

## 总结

所有代码配置已经正确，问题很可能出在：

1. **Vercel 环境变量未正确设置**（最常见）
2. **OAuth Callback URL 配置错误**（使用了 redeploy URL 而不是固定 domain）
3. **HTTPS 配置问题**（`__Secure-*` cookie 需要 HTTPS）

请按照上述检查清单逐一验证，特别是 Vercel 环境变量和 OAuth Callback URL 配置。

