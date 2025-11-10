# Vercel OAuth 登录问题调试指南

## 问题现象

- OAuth 回调 URL 可以访问（说明路由正常）
- 但回调后自动回到 `/auth/signin` 页面（说明 session 未正确创建）
- 测试登录可以正常工作（说明 MongoDB 和 Pusher 正常）

## 可能原因

1. **Vercel 环境变量未正确设置**
   - 环境变量名称不匹配
   - 环境变量值包含空格或特殊字符
   - 环境变量未设置为 Production 环境

2. **OAuth 回调后 session 创建失败**
   - JWT callback 中用户查找失败
   - 数据库连接问题
   - Token 设置问题

## 调试步骤

### 1. 检查 Vercel 环境变量

在 Vercel Dashboard 中检查以下环境变量是否都已设置（**必须选择 Production 环境**）：

```
NEXTAUTH_URL=https://xlikeapp.vercel.app
NEXTAUTH_SECRET=<你的密钥>
GITHUB_ID=<你的 GitHub Client ID>
GITHUB_SECRET=<你的 GitHub Client Secret>
GOOGLE_CLIENT_ID=<你的 Google Client ID>
GOOGLE_CLIENT_SECRET=<你的 Google Client Secret>
DATABASE_URL=<你的 MongoDB 连接字符串>
```

**重要提示：**
- 环境变量名称必须**完全匹配**（区分大小写）
- 确保选择 **Production** 环境
- 设置后**必须重新部署**

### 2. 查看 Vercel 日志

部署后，在 Vercel Dashboard 中查看 Function Logs，应该能看到：

```
🔐 OAuth Providers 配置检查:
  NODE_ENV: production
  GitHub ID: 已设置 (...)
  GitHub Secret: 已设置 (...)
  GitHub: ✓ 已配置
  Google ID: 已设置 (...)
  Google Secret: 已设置 (...)
  Google: ✓ 已配置
  ✓ 总共配置了 2 个 OAuth providers
[NextAuth] Initializing NextAuth...
[NextAuth] Providers count: 2
```

如果看到 "未配置" 或 "Providers count: 0"，说明环境变量未正确加载。

### 3. 检查 OAuth 回调 URL

确保在 OAuth 提供商中配置的回调 URL 与 Vercel 生产 URL 匹配：

**GitHub:**
```
https://xlikeapp.vercel.app/api/auth/callback/github
```

**Google:**
```
https://xlikeapp.vercel.app/api/auth/callback/google
```

### 4. 检查数据库连接

如果 OAuth providers 配置正确，但登录后仍被重定向，可能是数据库查询失败。查看 Vercel 日志中的错误信息：

```
[JWT] User lookup by email: ...
[JWT] Error looking up user by email: ...
```

## 解决方案

### 如果环境变量未加载

1. 在 Vercel Dashboard 中重新设置所有环境变量
2. 确保环境变量名称完全匹配（区分大小写）
3. 确保选择 **Production** 环境
4. 重新部署应用

### 如果环境变量已加载但登录失败

1. 查看 Vercel Function Logs 中的详细错误信息
2. 检查数据库连接是否正常
3. 检查 JWT callback 中的用户查找逻辑

## 验证步骤

部署后，访问以下 URL 并查看 Vercel 日志：

1. `https://xlikeapp.vercel.app/api/auth/providers` - 应该返回 GitHub 和 Google providers
2. `https://xlikeapp.vercel.app/api/auth/callback/github` - 应该重定向到 GitHub 登录
3. 完成 OAuth 登录后，查看日志中的 `[JWT]` 和 `[Middleware]` 日志

