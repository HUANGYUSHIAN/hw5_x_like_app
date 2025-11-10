# GitHub OAuth 登录问题排查指南

## 错误信息

```
CallbackRouteError: no authorization code in "callbackParameters"
```

这个错误表示 GitHub 回调时没有正确传递 authorization code。

## ⚠️ 重要：GitHub 速率限制问题

**如果看到 GitHub 显示 "Reauthorization required" 页面**，说明你的 OAuth App 在短时间内触发了太多请求，被 GitHub 临时限制了。

### 速率限制的症状

1. ✅ 日志显示：`CallbackRouteError: no authorization code in "callbackParameters"`
2. ✅ OAuth App 的 callback URL 正确，环境变量也正确
3. 🔴 但授权后被导回 `/edit` 或 `/auth/signin` 页面
4. 🔴 GitHub 显示 "Reauthorization required" 页面

### 解决方案

**立即措施：**
- ⏸️ **等待 15-30 分钟**：GitHub 的限制通常会自动解除
- ⏸️ **暂停所有测试登录**：在此期间不要尝试登录
- ✅ **使用 Google OAuth 作为替代**：如果必须测试，可以使用 Google 登录

**长期预防：**
- ✅ 避免短时间内多次测试同一账号
- ✅ 使用不同的 GitHub 账号或浏览器测试
- ✅ 避免频繁重新部署到 Vercel

详细说明请参考：`GITHUB_OAUTH_RATE_LIMIT_FIX.md`

## 可能原因分析

### 1. GitHub OAuth App 回调 URL 配置不正确（最常见）

**检查步骤：**

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 选择你的 OAuth App
3. 检查 **"Authorization callback URL"** 字段

**必须完全匹配（包括协议、域名、路径）：**

```
https://xlikeapp.vercel.app/api/auth/callback/github
```

**常见错误：**
- ❌ `https://xlikeapp.vercel.app/api/auth/callback/github/` (有尾部斜杠)
- ❌ `http://xlikeapp.vercel.app/api/auth/callback/github` (使用 http 而不是 https)
- ❌ `https://xlikeapp.vercel.app/auth/callback/github` (缺少 `/api`)
- ❌ `https://xlikeapp.vercel.app/api/auth/callback/github?code=xxx` (包含查询参数)

**正确格式：**
- ✅ `https://xlikeapp.vercel.app/api/auth/callback/github` (完全匹配，无尾部斜杠)

### 2. GitHub OAuth App 类型问题

确保你的 GitHub OAuth App 类型是 **"OAuth App"** 而不是 **"GitHub App"**。

**检查步骤：**
1. 在 GitHub Developer Settings 中，确认你创建的是 **"OAuth Apps"** 而不是 **"GitHub Apps"**
2. 如果是 GitHub App，需要创建新的 OAuth App

### 3. 环境变量问题

**检查 Vercel 环境变量：**

确保以下环境变量都已正确设置（**必须选择 Production 环境**）：

```
NEXTAUTH_URL=https://xlikeapp.vercel.app
GITHUB_ID=<你的 GitHub Client ID>
GITHUB_SECRET=<你的 GitHub Client Secret>
NEXTAUTH_SECRET=<你的密钥>
```

**重要提示：**
- `NEXTAUTH_URL` 必须是完整的 URL，**不要**包含尾部斜杠
- 环境变量名称必须**完全匹配**（区分大小写）
- 设置后**必须重新部署**项目

### 4. GitHub OAuth App 权限问题

确保 GitHub OAuth App 已正确配置权限：

1. 在 GitHub Developer Settings 中，选择你的 OAuth App
2. 检查 **"User permissions"** 部分
3. 确保至少有以下权限：
   - ✅ **Email addresses** (read)
   - ✅ **Profile** (read)

### 5. 用户邮箱验证问题

GitHub 要求用户验证其主要邮箱地址才能使用 OAuth。如果用户的主要邮箱未验证，可能会出现问题。

**解决方案：**
- 提示用户在 GitHub 账户设置中验证主要邮箱地址

## 与 Google OAuth 的差异

GitHub 和 Google 的 OAuth 流程有一些差异：

1. **回调 URL 验证更严格**：GitHub 对回调 URL 的匹配要求更严格
2. **Scope 配置**：GitHub 需要明确指定 scope（已在代码中添加 `read:user user:email`）
3. **邮箱验证**：GitHub 要求用户验证主要邮箱

## 修复步骤

### 步骤 1: 检查 GitHub OAuth App 配置

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 选择你的 OAuth App
3. 确认以下配置：

**Application name:** (你的应用名称)

**Homepage URL:**
```
https://xlikeapp.vercel.app
```

**Authorization callback URL:**
```
https://xlikeapp.vercel.app/api/auth/callback/github
```

**重要：**
- 回调 URL 必须**完全匹配**，不能有尾部斜杠
- 不能包含查询参数
- 必须使用 HTTPS（生产环境）

### 步骤 2: 检查 Vercel 环境变量

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** > **Environment Variables**
4. 确认以下变量都已设置（**Production 环境**）：

```
NEXTAUTH_URL=https://xlikeapp.vercel.app
GITHUB_ID=<你的 GitHub Client ID>
GITHUB_SECRET=<你的 GitHub Client Secret>
NEXTAUTH_SECRET=<你的密钥>
```

5. 如果修改了环境变量，**必须重新部署**

### 步骤 3: 验证配置

部署后，在 Vercel Function Logs 中应该看到：

```
🔐 OAuth Providers 配置检查:
  NODE_ENV: production
  GitHub ID: 已设置 (Ov23liXXlZ...)
  GitHub Secret: 已设置 (bd1dc...)
  GitHub: ✓ 已配置
  ✓ NEXTAUTH_URL: https://xlikeapp.vercel.app
  ✓ 总共配置了 2 个 OAuth providers
```

### 步骤 4: 测试登录

1. 访问 `https://xlikeapp.vercel.app/auth/signin`
2. 点击 "使用 GitHub 登入"
3. 应该能正常跳转到 GitHub 授权页面
4. 授权后应该能正常回调

## 如果仍然失败

### 1. 检查 Vercel 日志

在 Vercel Dashboard 中查看 Function Logs，查找：
- `[OAuth]` 开头的日志
- `[SignIn]` 开头的日志
- 任何错误信息

### 2. 清除浏览器缓存

- 清除浏览器缓存和 Cookie
- 或使用隐私模式（无痕模式）测试

### 3. 检查 GitHub OAuth App 状态

确保你的 GitHub OAuth App 没有被禁用或删除。

### 4. 验证 Client ID 和 Secret

确保：
- `GITHUB_ID` 与 GitHub OAuth App 中的 **Client ID** 完全匹配
- `GITHUB_SECRET` 与 GitHub OAuth App 中的 **Client secrets** 中的值完全匹配（注意：如果重新生成了 secret，需要更新环境变量）

### 5. 对比 Google 配置

如果 Google 登录正常，可以对比：
- Google OAuth 的回调 URL 配置
- Vercel 环境变量设置
- 确保 GitHub 的配置与 Google 的配置方式一致

## 代码修改

我已经在代码中添加了 GitHub provider 的 scope 配置：

```typescript
GitHubProvider({
  clientId: githubId!,
  clientSecret: githubSecret!,
  authorization: {
    params: {
      scope: 'read:user user:email',
    },
  },
})
```

这确保了 GitHub OAuth 请求正确的权限。

## 参考链接

- [GitHub OAuth Apps 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [NextAuth.js GitHub Provider](https://next-auth.js.org/providers/github)
- [GitHub Developer Settings](https://github.com/settings/developers)

