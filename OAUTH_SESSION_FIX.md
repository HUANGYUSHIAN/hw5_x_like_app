# OAuth Session 持久化问题修复指南

## 问题现象

从 Vercel 日志可以看到：
- `[JWT] Existing user found: test1 token.sub: 69106d9320ba399142777723 needsRegistration: false` ✅
- `/api/auth/callback/google` 返回 302 ✅
- `/` 返回 307（重定向）❌
- 最终回到 `/auth/signin` ❌

**问题诊断：** JWT callback 正常工作，但 session cookie 没有被正确设置或读取。

## 已实施的修复

### 1. 添加 `trustHost: true`
```typescript
export const authOptions: NextAuthConfig = {
  trustHost: true, // NextAuth v5 在生产环境必需
  // ...
}
```

### 2. 在 middleware 中显式指定 cookie 名称
```typescript
const token = await getToken({ 
  req: request,
  secret: process.env.NEXTAUTH_SECRET,
  cookieName: process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token',
})
```

### 3. 添加详细的调试日志
- middleware 会输出所有 cookies 和 token 状态
- JWT callback 会输出用户查找过程

## 需要检查的 Vercel 环境变量

**重要：** 在 Vercel Dashboard > Settings > Environment Variables 中，确保以下变量已设置（选择 **Production** 环境）：

```
NEXTAUTH_URL=https://xlikeapp.vercel.app
（⚠️ 不要有尾部斜杠 /）

NEXTAUTH_SECRET=<你的密钥>
（使用 openssl rand -base64 32 生成）

GITHUB_ID=<你的 GitHub Client ID>
GITHUB_SECRET=<你的 GitHub Client Secret>

GOOGLE_CLIENT_ID=<你的 Google Client ID>
GOOGLE_CLIENT_SECRET=<你的 Google Client Secret>
```

## 部署后验证步骤

### 1. 部署到 Vercel
```bash
vercel --prod
```

### 2. 查看 Vercel 日志
在 Vercel Dashboard > Deployments > 最新部署 > Functions 标签页，应该能看到：

**初始化日志：**
```
🔐 OAuth Providers 配置检查:
  ✓ NEXTAUTH_URL: https://xlikeapp.vercel.app
  ✓ 总共配置了 2 个 OAuth providers
[NextAuth] Initializing NextAuth...
[NextAuth] Providers count: 2
```

**OAuth 登录日志：**
```
[JWT] Existing user found: test1 token.sub: 69106d9320ba399142777723 needsRegistration: false
[Middleware] Cookie check: { cookies: [...], allCookies: [...] }
[Middleware] Token check: { hasToken: true/false, ... }
```

### 3. 检查浏览器 Cookies
1. 打开浏览器开发者工具 (F12)
2. 切换到 **Application** > **Cookies** > `https://xlikeapp.vercel.app`
3. 完成 OAuth 登录后，检查是否有以下 cookie：
   - `__Secure-next-auth.session-token` (生产环境)
   - 或 `next-auth.session-token` (开发环境)

**如果没有 cookie：**
- 说明 NextAuth 没有正确设置 cookie
- 检查 Vercel 日志中的错误信息
- 确认 `NEXTAUTH_SECRET` 和 `NEXTAUTH_URL` 正确设置

**如果有 cookie 但 middleware 读取不到：**
- 检查 cookie 名称是否匹配
- 查看 middleware 日志中的 `Cookie check` 输出

### 4. 常见问题排查

#### 问题 1: Cookie 没有被设置
**可能原因：**
- `NEXTAUTH_SECRET` 未设置或错误
- `NEXTAUTH_URL` 有尾部斜杠
- `trustHost: true` 未设置

**解决方案：**
- 检查 Vercel 环境变量
- 确保 `NEXTAUTH_URL` 没有尾部斜杠
- 确认 `authOptions` 中有 `trustHost: true`

#### 问题 2: Cookie 被设置了但 middleware 读取不到
**可能原因：**
- Cookie 名称不匹配
- `getToken` 没有指定 `cookieName`

**解决方案：**
- 查看 middleware 日志中的 `Cookie check` 输出
- 确认 cookie 名称与 `getToken` 中的 `cookieName` 匹配

#### 问题 3: Session 创建成功但立即失效
**可能原因：**
- `NEXTAUTH_SECRET` 在部署后改变
- Cookie domain 不匹配

**解决方案：**
- 确保 `NEXTAUTH_SECRET` 在所有环境中保持一致
- 检查 cookie 的 domain 设置

## 下一步

部署后，请提供以下信息以便进一步诊断：

1. **Vercel 日志中的 `[Middleware] Cookie check` 输出**
2. **浏览器开发者工具中看到的 cookies**
3. **Vercel 日志中的任何错误信息**

这些信息将帮助确定问题的根本原因。

