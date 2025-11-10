# OAuth 错误调试完整指南

## 📋 目录

1. [问题分类与快速诊断](#问题分类与快速诊断)
2. [系统性问题诊断流程](#系统性问题诊断流程)
3. [具体问题详解](#具体问题详解)
4. [Vercel 日志分析技巧](#vercel-日志分析技巧)
5. [常见错误模式识别](#常见错误模式识别)
6. [预防措施与最佳实践](#预防措施与最佳实践)

---

## 问题分类与快速诊断

### 🔍 快速诊断表

| 错误症状 | 可能原因 | 优先级 | 检查项 |
|---------|---------|--------|--------|
| `CallbackRouteError: no authorization code` | 1. GitHub 速率限制<br>2. Middleware 拦截<br>3. Callback URL 错误 | 🔴 高 | 检查 Vercel 日志、GitHub 状态、Middleware 配置 |
| 授权后回到 `/auth/signin` | 1. Session 未建立<br>2. Middleware 重定向<br>3. Token 验证失败 | 🔴 高 | 检查 Middleware、Session 配置、Cookie 设置 |
| `Unique constraint failed: users_email_key` | MongoDB 索引问题 | 🟡 中 | 检查 MongoDB Atlas 索引列表 |
| Provider 混淆（GitHub 用 Google） | Provider 验证缺失 | 🟡 中 | 检查 JWT callback 中的 provider 验证 |
| 新用户无法创建 | 1. 数据库索引问题<br>2. 用户查找逻辑错误 | 🟡 中 | 检查数据库索引、用户查找代码 |

---

## 系统性问题诊断流程

### 🎯 第一步：确认基础配置（必须 100% 正确）

#### 1.1 环境变量检查

**使用脚本验证：**
```bash
npm run check-github-oauth -- https://xlikeapp.vercel.app
```

**手动检查清单：**
- [ ] `NEXTAUTH_URL` - 必须完整 URL，无尾部斜杠
- [ ] `GITHUB_ID` / `GITHUB_SECRET` - 与 GitHub OAuth App 完全匹配
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - 与 Google Cloud Console 完全匹配
- [ ] `NEXTAUTH_SECRET` - 已设置且足够复杂
- [ ] **重要：** 所有环境变量必须在 **Production** 环境设置

**常见错误：**
- ❌ `NEXTAUTH_URL=https://xlikeapp.vercel.app/` (有尾部斜杠)
- ❌ 环境变量只在 Development 环境设置
- ❌ Client ID/Secret 复制时包含空格或换行

#### 1.2 OAuth App 配置检查

**GitHub OAuth App：**
1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 确认是 **"OAuth App"** 而不是 "GitHub App"
3. **Authorization callback URL** 必须完全匹配：
   ```
   https://xlikeapp.vercel.app/api/auth/callback/github
   ```
   - ❌ 不能有尾部斜杠
   - ❌ 不能包含查询参数
   - ❌ 必须使用 HTTPS

**Google OAuth：**
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 确认 **"已授权的重定向 URI"** 包含：
   ```
   https://xlikeapp.vercel.app/api/auth/callback/google
   ```

#### 1.3 代码配置检查

**检查 Provider 配置：**
```typescript
// src/app/api/auth/[...nextauth]/authOptions.ts
// 确认 GitHub Provider 有 scope 配置
GitHubProvider({
  clientId: githubId!,
  clientSecret: githubSecret!,
  authorization: {
    params: {
      scope: 'read:user user:email', // ← 必须包含
    },
  },
})
```

---

### 🎯 第二步：检查 Middleware 配置

#### 2.1 Middleware 必须跳过 Callback 路由

**检查 `src/middleware.ts`：**

```typescript
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ⚠️ 这是最关键的检查！必须放在最前面
  if (pathname.startsWith('/api/auth/callback/')) {
    return NextResponse.next() // ← 必须直接返回，不做任何处理
  }
  
  // ... 其他逻辑
}
```

**为什么重要：**
- Middleware 如果拦截 callback，会丢失 `authorization code`
- NextAuth 无法建立 session
- 用户会被重定向回登录页

**验证方法：**
1. 检查 Vercel 日志，看是否有 `[Middleware] 跳过 OAuth callback 路由` 日志
2. 如果没有，说明 middleware 可能拦截了 callback

#### 2.2 Matcher 配置检查

**检查 `src/middleware.ts` 的 `config.matcher`：**

```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth/signin).*)',
    // ↑ 必须排除 'api'，这样 /api/auth/callback/* 不会被匹配
  ],
}
```

---

### 🎯 第三步：检查数据库配置

#### 3.1 MongoDB 索引检查（关键！）

**问题：** Prisma schema 更新后，MongoDB 索引可能没有同步更新。

**检查方法：**

1. **在 MongoDB Atlas 中查看索引：**
   - 访问 MongoDB Atlas Dashboard
   - 选择你的数据库和 `users` 集合
   - 查看 "Indexes" 标签

2. **正确的索引配置：**
   ```
   _id_                    - _id (默认索引)
   users_userId_key         - userId (UNIQUE)
   email_1_provider_1       - email + provider (COMPOUND UNIQUE) ← 必须存在
   ```

3. **错误的索引配置（会导致问题）：**
   ```
   users_email_key          - email (UNIQUE) ← 这是旧的，必须删除
   ```

**如何发现这个问题：**

1. **错误信息：**
   ```
   Unique constraint failed on the constraint: `users_email_key`
   ```

2. **症状：**
   - 相同 email 但不同 provider 的用户无法创建
   - 错误发生在 `prisma.user.create()` 时

3. **验证方法：**
   ```bash
   # 在 MongoDB Shell 中运行
   db.users.getIndexes()
   ```
   如果看到 `users_email_key` 或 `email_1`（只有 email，没有 provider），说明有问题。

**修复方法：**
```javascript
// 在 MongoDB Shell 中
db.users.dropIndex("users_email_key")  // 删除旧的
db.users.createIndex(
  { email: 1, provider: 1 },
  { unique: true, name: "email_1_provider_1" }
)  // 创建新的复合索引
```

或使用脚本：
```bash
npm run fix-mongodb-indexes
```

#### 3.2 Prisma Schema 验证

**检查 `prisma/schema.prisma`：**

```prisma
model User {
  // ...
  email    String?
  provider String
  // ...
  @@unique([email, provider]) // ← 必须是复合唯一索引
  @@map("users")
}
```

**重要：** Schema 和数据库索引必须匹配！

---

### 🎯 第四步：检查 Provider 验证逻辑

#### 4.1 Provider 值验证

**问题：** GitHub 登录可能被误认为是 Google，或反之。

**检查 `src/app/api/auth/[...nextauth]/authOptions.ts` 的 JWT callback：**

```typescript
async jwt({ token, user, account }) {
  if (user && account) {
    // ⚠️ 必须验证 provider 值
    if (account.provider !== 'github' && account.provider !== 'google') {
      console.error('[OAuth] ❌ 错误：未知的 provider:', account.provider)
      throw new Error(`不支持的 OAuth provider: ${account.provider}`)
    }
    
    // ⚠️ 必须明确设置 provider
    const correctProvider = account.provider === 'github' ? 'github' : 
                           account.provider === 'google' ? 'google' : 
                           account.provider
    
    // ⚠️ 创建用户时必须使用正确的 provider
    const newUser = await prisma.user.create({
      data: {
        // ...
        provider: correctProvider, // ← 不能直接用 account.provider
        // ...
      },
    })
    
    // ⚠️ 验证创建的用户的 provider
    if (newUser.provider !== correctProvider) {
      console.error('[OAuth] ❌ 错误：创建的用户 provider 不正确')
    }
  }
}
```

**如何发现这个问题：**

1. **检查 Vercel 日志：**
   ```
   [OAuth] Provider: github
   [OAuth] ✓ GitHub 登录，provider 正确: github
   ```
   如果看到 provider 不匹配的警告，说明有问题。

2. **症状：**
   - 用户登录后，数据库中的 `provider` 字段不正确
   - 相同 email 但不同 provider 的用户被错误地关联

---

## 具体问题详解

### 问题 1：GitHub OAuth 速率限制

#### 症状

1. ✅ 日志显示：`CallbackRouteError: no authorization code in "callbackParameters"`
2. ✅ OAuth App 配置正确，环境变量正确
3. 🔴 但授权后被导回 `/edit` 或 `/auth/signin` 页面
4. 🔴 GitHub 显示 "Reauthorization required" 页面

#### 根本原因

GitHub 检测到 OAuth App 在短时间内发出了异常大量的请求，临时阻止了授权流程。

#### 诊断步骤

1. **检查 GitHub OAuth App 状态：**
   - 访问 [GitHub Developer Settings](https://github.com/settings/developers)
   - 选择你的 OAuth App
   - 如果看到 "Reauthorization required"，说明被限制

2. **检查 Vercel 日志：**
   ```
   [auth][error] CallbackRouteError: no authorization code in "callbackParameters"
   [auth][details]: { "provider": "github" }
   ```

3. **确认配置正确：**
   - 运行 `npm run check-github-oauth` 确认配置正确
   - 如果配置正确但仍然失败，很可能是速率限制

#### 解决方案

1. **立即措施：**
   - ⏸️ 等待 15-30 分钟
   - ⏸️ 暂停所有测试登录
   - ✅ 使用 Google OAuth 作为替代

2. **长期预防：**
   - 避免短时间内多次测试同一账号
   - 使用不同的 GitHub 账号或浏览器测试
   - 避免频繁重新部署到 Vercel

---

### 问题 2：Middleware 拦截 Callback

#### 症状

1. OAuth 授权成功
2. 回调 URL 被触发
3. 但用户被重定向回 `/auth/signin`
4. 日志中没有 `[OAuth]` 开头的日志

#### 根本原因

Middleware 拦截了 `/api/auth/callback/*` 路由，导致：
- Authorization code 丢失
- NextAuth 无法建立 session
- Middleware 检测到没有 token，重定向到登录页

#### 诊断步骤

1. **检查 `src/middleware.ts`：**
   ```typescript
   // ⚠️ 必须放在最前面
   if (pathname.startsWith('/api/auth/callback/')) {
     return NextResponse.next()
   }
   ```

2. **检查 Vercel 日志：**
   - 如果有 `[Middleware]` 日志出现在 callback 之前，说明 middleware 拦截了

3. **检查 Matcher 配置：**
   ```typescript
   matcher: [
     '/((?!api|_next/static|_next/image|favicon.ico|auth/signin).*)',
     // ↑ 必须排除 'api'
   ]
   ```

#### 解决方案

确保 middleware 完全跳过 callback 路由：

```typescript
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ⚠️ 最优先检查，必须放在最前面
  if (pathname.startsWith('/api/auth/callback/')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] 跳过 OAuth callback 路由:', pathname)
    }
    return NextResponse.next()
  }
  
  // ... 其他逻辑
}
```

---

### 问题 3：MongoDB 索引问题

#### 症状

1. 错误信息：
   ```
   Unique constraint failed on the constraint: `users_email_key`
   ```

2. 症状：
   - 相同 email 但不同 provider 的用户无法创建
   - 错误发生在 `prisma.user.create()` 时

#### 根本原因

数据库中还存在旧的 `email` 唯一索引，而 Prisma schema 已更新为 `@@unique([email, provider])`。

#### 诊断步骤

1. **在 MongoDB Atlas 中查看索引：**
   - 访问 MongoDB Atlas Dashboard
   - 选择数据库和 `users` 集合
   - 查看 "Indexes" 标签

2. **检查索引列表：**
   ```
   ❌ 错误的配置：
   users_email_key          - email (UNIQUE) ← 这是旧的，必须删除
   
   ✅ 正确的配置：
   email_1_provider_1       - email + provider (COMPOUND UNIQUE)
   ```

3. **验证 Prisma Schema：**
   ```prisma
   @@unique([email, provider]) // ← 必须是复合唯一索引
   ```

#### 解决方案

**方法 1：使用 MongoDB Shell**
```javascript
// 删除旧的索引
db.users.dropIndex("users_email_key")
// 或
db.users.dropIndex("email_1")

// 创建新的复合索引
db.users.createIndex(
  { email: 1, provider: 1 },
  { unique: true, name: "email_1_provider_1" }
)

// 验证
db.users.getIndexes()
```

**方法 2：使用修复脚本**
```bash
npm run fix-mongodb-indexes
```

**方法 3：使用 MongoDB Compass**
1. 打开 MongoDB Compass
2. 连接到数据库
3. 选择 `users` 集合
4. 点击 "Indexes" 标签
5. 删除旧的 `email` 唯一索引
6. 创建新的 `[email, provider]` 复合唯一索引

---

### 问题 4：Provider 混淆

#### 症状

1. GitHub 登录后，数据库中的 `provider` 字段是 `google`
2. 或 Google 登录后，`provider` 字段是 `github`
3. 相同 email 但不同 provider 的用户被错误地关联

#### 根本原因

代码中没有明确验证和设置 provider 值。

#### 诊断步骤

1. **检查 Vercel 日志：**
   ```
   [OAuth] Provider: github
   [OAuth] ✓ GitHub 登录，provider 正确: github
   ```
   如果看到 provider 不匹配的警告，说明有问题。

2. **检查代码中的 provider 验证：**
   ```typescript
   // ⚠️ 必须验证 provider 值
   if (account.provider !== 'github' && account.provider !== 'google') {
     console.error('[OAuth] ❌ 错误：未知的 provider:', account.provider)
     throw new Error(`不支持的 OAuth provider: ${account.provider}`)
   }
   
   // ⚠️ 必须明确设置 provider
   const correctProvider = account.provider === 'github' ? 'github' : 
                          account.provider === 'google' ? 'google' : 
                          account.provider
   ```

#### 解决方案

确保在 JWT callback 和 signIn callback 中都正确验证和设置 provider：

```typescript
async jwt({ token, user, account }) {
  if (user && account) {
    // 验证 provider
    const correctProvider = account.provider === 'github' ? 'github' : 
                           account.provider === 'google' ? 'google' : 
                           account.provider
    
    // 创建用户时使用正确的 provider
    const newUser = await prisma.user.create({
      data: {
        provider: correctProvider, // ← 不能直接用 account.provider
        // ...
      },
    })
    
    // 验证
    if (newUser.provider !== correctProvider) {
      console.error('[OAuth] ❌ 错误：创建的用户 provider 不正确')
    }
    
    token.provider = correctProvider
  }
}
```

---

## Vercel 日志分析技巧

### 🔍 关键日志模式

#### 正常流程日志

```
[OAuth] ========== OAuth 回传数据 ==========
[OAuth] Provider: github
[OAuth] ✓ GitHub 登录，provider 正确: github
[OAuth] 根据 provider + providerId 查找用户: github ... ✓ 找到
[OAuth] ✓ 找到现有用户，使用现有账户
```

#### 新用户创建日志

```
[OAuth] ========== OAuth 回传数据 ==========
[OAuth] Provider: github
[OAuth] 根据 provider + providerId 查找用户: github ... ✗ 未找到
[OAuth] 根据 email + provider 查找用户: ... github ✗ 未找到
[OAuth] ✗ 新用户，自动创建账户
[OAuth] 生成临时 userID: ...
[OAuth] ✓ 用户创建成功，provider 正确: github
[OAuth] Token 已设置，用户将被重定向到 /{userId}/edit 页面
```

#### 错误日志模式

**1. GitHub 速率限制：**
```
[auth][error] CallbackRouteError: no authorization code in "callbackParameters"
[auth][details]: { "provider": "github" }
```

**2. 数据库索引问题：**
```
[OAuth] ❌ 创建用户失败: Error [PrismaClientKnownRequestError]: 
Unique constraint failed on the constraint: `users_email_key`
```

**3. Provider 验证失败：**
```
[OAuth] ❌ 错误：未知的 provider: xxx
```

**4. Middleware 拦截（间接证据）：**
```
[Middleware] No token found, redirecting to /auth/signin
```
（如果出现在 callback 之后，说明 middleware 拦截了）

### 📊 日志分析流程

1. **查找 `[OAuth]` 开头的日志**
   - 这些日志显示 OAuth 流程的每个步骤
   - 如果没有这些日志，说明 OAuth callback 没有被正确处理

2. **查找 `[auth][error]` 开头的日志**
   - 这些是 NextAuth 的错误日志
   - 通常包含详细的错误信息

3. **查找 `[Middleware]` 开头的日志**
   - 检查 middleware 是否拦截了 callback
   - 检查重定向逻辑

4. **时间线分析**
   - 按时间顺序查看日志
   - 找出错误发生的时间点
   - 检查错误前后的日志

### 🎯 常见日志组合

| 日志组合 | 问题 | 解决方案 |
|---------|------|---------|
| `CallbackRouteError` + 配置正确 | GitHub 速率限制 | 等待 15-30 分钟 |
| 没有 `[OAuth]` 日志 + 重定向到 `/auth/signin` | Middleware 拦截 | 检查 middleware 配置 |
| `Unique constraint failed: users_email_key` | 数据库索引问题 | 修复 MongoDB 索引 |
| `Provider: github` + `provider 不正确` | Provider 验证问题 | 检查 provider 验证逻辑 |

---

## 常见错误模式识别

### 模式 1：配置看起来正确，但仍然失败

**症状：**
- 所有配置检查都通过
- 但 OAuth 登录仍然失败

**可能原因：**
1. **GitHub 速率限制** - 最可能
2. **Middleware 拦截** - 检查 middleware 日志
3. **数据库索引问题** - 检查 MongoDB Atlas

**诊断方法：**
1. 运行 `npm run check-github-oauth` 确认配置
2. 检查 Vercel 日志中的错误信息
3. 检查 MongoDB Atlas 索引列表
4. 检查 middleware 是否拦截 callback

### 模式 2：新用户无法创建

**症状：**
- OAuth 授权成功
- 但用户无法创建
- 错误信息包含 `Unique constraint failed`

**可能原因：**
1. **数据库索引问题** - 最可能
2. **用户查找逻辑错误** - 检查代码

**诊断方法：**
1. 检查 MongoDB Atlas 索引列表
2. 检查 Prisma schema 中的唯一约束
3. 检查用户创建代码中的错误处理

### 模式 3：Provider 混淆

**症状：**
- GitHub 登录后，数据库中的 `provider` 是 `google`
- 或反之

**可能原因：**
1. **Provider 验证缺失** - 检查代码
2. **Provider 值设置错误** - 检查创建用户的代码

**诊断方法：**
1. 检查 Vercel 日志中的 provider 验证日志
2. 检查数据库中的 `provider` 字段值
3. 检查 JWT callback 中的 provider 设置逻辑

---

## 预防措施与最佳实践

### ✅ 代码层面

1. **Provider 验证**
   ```typescript
   // 必须验证 provider 值
   if (account.provider !== 'github' && account.provider !== 'google') {
     throw new Error(`不支持的 OAuth provider: ${account.provider}`)
   }
   
   // 必须明确设置 provider
   const correctProvider = account.provider === 'github' ? 'github' : 
                          account.provider === 'google' ? 'google' : 
                          account.provider
   ```

2. **Middleware 保护**
   ```typescript
   // 必须完全跳过 callback 路由
   if (pathname.startsWith('/api/auth/callback/')) {
     return NextResponse.next()
   }
   ```

3. **详细的日志**
   ```typescript
   console.log('[OAuth] Provider:', account.provider)
   console.log('[OAuth] ✓ GitHub 登录，provider 正确: github')
   ```

4. **错误处理**
   ```typescript
   // 必须处理数据库唯一约束错误
   catch (createError: any) {
     if (createError.code === 'P2002') {
       // 处理唯一约束冲突
     }
   }
   ```

### ✅ 配置层面

1. **环境变量检查**
   - 使用脚本验证：`npm run check-github-oauth`
   - 确保所有变量都在 Production 环境设置

2. **OAuth App 配置**
   - Callback URL 必须完全匹配
   - 不能有尾部斜杠
   - 必须使用 HTTPS

3. **数据库索引**
   - Schema 更新后，必须同步更新数据库索引
   - 定期检查 MongoDB Atlas 索引列表

### ✅ 测试层面

1. **避免触发速率限制**
   - 使用不同的账号测试
   - 使用不同的浏览器或隐私模式
   - 测试间隔至少 1-2 分钟

2. **验证流程**
   - 测试新用户创建
   - 测试现有用户登录
   - 测试相同 email 但不同 provider 的用户

3. **日志监控**
   - 定期检查 Vercel 日志
   - 关注 `[OAuth]` 和 `[auth][error]` 日志

---

## 调试检查清单

### 🔍 当 OAuth 登录失败时，按顺序检查：

1. **基础配置（必须 100% 正确）**
   - [ ] 运行 `npm run check-github-oauth` 验证配置
   - [ ] 检查 OAuth App 的 Callback URL
   - [ ] 检查 Vercel 环境变量（Production 环境）

2. **Middleware 配置**
   - [ ] 检查 `src/middleware.ts` 是否跳过 callback 路由
   - [ ] 检查 matcher 配置是否排除 `api`

3. **数据库配置**
   - [ ] 检查 MongoDB Atlas 索引列表
   - [ ] 确认 `email_1_provider_1` 复合索引存在
   - [ ] 确认旧的 `users_email_key` 索引已删除

4. **代码逻辑**
   - [ ] 检查 provider 验证逻辑
   - [ ] 检查用户查找逻辑
   - [ ] 检查错误处理逻辑

5. **Vercel 日志**
   - [ ] 查找 `[OAuth]` 开头的日志
   - [ ] 查找 `[auth][error]` 开头的日志
   - [ ] 查找 `[Middleware]` 开头的日志
   - [ ] 分析时间线和错误模式

6. **GitHub 状态**
   - [ ] 检查 GitHub OAuth App 状态
   - [ ] 确认没有被速率限制

---

## 总结

### 🎯 关键要点

1. **配置必须 100% 正确**
   - 环境变量、OAuth App 配置、Callback URL 必须完全匹配

2. **Middleware 必须跳过 Callback**
   - 这是最容易被忽略但最关键的问题

3. **数据库索引必须与 Schema 匹配**
   - Prisma schema 更新后，必须同步更新数据库索引

4. **Provider 必须明确验证**
   - 不能依赖默认值，必须明确设置和验证

5. **详细的日志是关键**
   - 通过日志可以快速定位问题

### 📚 相关文档

- `GITHUB_OAUTH_TROUBLESHOOTING.md` - GitHub OAuth 问题排查
- `GITHUB_OAUTH_RATE_LIMIT_FIX.md` - GitHub 速率限制修复
- `DATABASE_INDEX_FIX.md` - 数据库索引修复
- `MONGODB_INDEX_FIX_COMMANDS.md` - MongoDB 索引修复命令
- `OAUTH_INDEX_VERIFICATION.md` - OAuth 索引验证

### 🛠️ 有用的脚本

```bash
# 检查 GitHub OAuth 配置
npm run check-github-oauth -- https://xlikeapp.vercel.app

# 修复 MongoDB 索引
npm run fix-mongodb-indexes

# 检查数据库连接
npm run check-db
```

---

**最后更新：** 2025-11-11  
**维护者：** 开发团队

