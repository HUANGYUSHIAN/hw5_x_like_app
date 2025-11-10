# OAuth Session userId 修复说明

## 问题描述

OAuth 登录成功后，虽然 cookie 已设置，middleware 可以读取到 token（包括 `userId: 'test1'`），但前端 `useSession()` 返回的 session 中 `userId` 为 `null`，导致：
- Profile 链接指向 `/profile`（不存在的路由），而不是 `/test1`
- 显示 "User not found" 错误

## 根本原因

**路由冲突**：自定义的 `/api/auth/session/route.ts` 与 NextAuth v5 内置的 `/api/auth/session` endpoint 冲突。

NextAuth v5 通过 `[...nextauth]` catch-all route 自动创建 `/api/auth/session` endpoint，该 endpoint 会调用 `authOptions.ts` 中的 `session` callback。

自定义的 route 覆盖了 NextAuth 内置的 endpoint，导致：
- `useSession()` 调用自定义 route，而不是 NextAuth 内置 endpoint
- Session callback 没有被正确调用
- `session.user.userId` 没有被正确设置

## 解决方案

### 1. 删除自定义 session route

已删除 `src/app/api/auth/session/route.ts`，让 NextAuth 使用内置的 `/api/auth/session` endpoint。

### 2. 确保 session callback 正确返回 userId

在 `src/app/api/auth/[...nextauth]/authOptions.ts` 中的 `session` callback 已正确设置：

```typescript
async session({ session, token }) {
  // ... 验证和数据库查询 ...
  
  if (dbUser) {
    session.user.id = dbUser.id
    session.user.userId = dbUser.userId // ✅ 确保 session 包含 userID
    // ...
  }
  
  return session
}
```

### 3. 类型定义

在 `src/types/next-auth.d.ts` 中已正确定义：

```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      userId?: string  // ✅ 已定义
      // ...
    }
  }
}
```

## 工作流程

1. **OAuth 登录成功** → NextAuth 设置 cookie `__Secure-next-auth.session-token`
2. **前端 `useSession()` 调用** → `/api/auth/session`（NextAuth 内置 endpoint）
3. **NextAuth 内置 endpoint** → 调用 `authOptions.ts` 中的 `session` callback
4. **Session callback** → 从数据库查询用户，设置 `session.user.userId`
5. **返回 session** → 前端获取到包含 `userId` 的完整 session

## 调试日志

Session callback 中已添加详细的调试日志：

```
[Session Callback] ========== Session Callback 被调用 ==========
[Session Callback] Token: { sub, userId, email, ... }
[Session Callback] ✓ 用户数据已设置: { userId, id, email, name }
[Session Callback] ========== 返回 Session ==========
```

可以在 Vercel logs 中查看这些日志，确认 `userId` 是否被正确设置。

## 验证步骤

1. **OAuth 登录**（Google 或 GitHub）
2. **检查 Vercel logs**：
   - 应该看到 `[Session Callback]` 日志
   - 应该看到 `session.user.userId` 被设置
3. **检查前端 session**：
   - `useSession()` 应该返回包含 `userId` 的 session
   - Profile 链接应该指向 `/{userId}`，而不是 `/profile`

## 注意事项

- **不要创建自定义 `/api/auth/session` route**：NextAuth v5 已内置处理
- **Session callback 必须返回完整的 session 对象**：包括 `session.user.userId`
- **类型定义必须匹配**：确保 `Session` 接口包含 `userId` 字段

## 相关文件

- `src/app/api/auth/[...nextauth]/authOptions.ts` - Session callback 定义
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `src/types/next-auth.d.ts` - TypeScript 类型定义
- ~~`src/app/api/auth/session/route.ts`~~ - **已删除**

