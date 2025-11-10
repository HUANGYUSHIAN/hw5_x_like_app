# 数据库索引修复指南

## 问题描述

当 Prisma schema 从 `@@unique([email])` 更新为 `@@unique([email, provider])` 时，MongoDB 数据库中可能还存在旧的 `email` 唯一索引。

### 错误信息

```
Unique constraint failed on the constraint: `users_email_key`
```

或

```
Invalid `prisma.user.create()` invocation:
Unique constraint failed on the constraint: `users_email_key`
```

### 根本原因

1. **旧的唯一索引**：数据库中还存在一个只基于 `email` 字段的唯一索引
2. **新的复合索引**：Prisma schema 要求使用 `[email, provider]` 复合唯一索引
3. **冲突**：当尝试创建相同 email 但不同 provider 的用户时，旧的索引会阻止创建

## 解决方案

### 方法 1：使用修复脚本（推荐）

运行修复脚本：

```bash
npm run fix-db-indexes
```

这个脚本会：
1. 检查当前数据库索引
2. 识别旧的 `email` 唯一索引
3. 提供删除旧索引的指导
4. 验证新的复合索引是否存在

### 方法 2：手动修复（MongoDB Shell）

1. **连接到 MongoDB 数据库**

   使用 MongoDB Compass、Atlas UI 或 MongoDB Shell：

   ```bash
   mongosh "your-connection-string"
   ```

2. **选择数据库**

   ```javascript
   use your-database-name
   ```

3. **查看当前索引**

   ```javascript
   db.users.getIndexes()
   ```

   应该会看到类似这样的输出：

   ```javascript
   [
     { v: 2, key: { _id: 1 }, name: '_id_' },
     { v: 2, key: { email: 1 }, name: 'email_1' },  // ← 这是旧的索引，需要删除
     { v: 2, key: { userId: 1 }, name: 'userId_1', unique: true },
     // ... 其他索引
   ]
   ```

4. **删除旧的 email 唯一索引**

   ```javascript
   db.users.dropIndex("email_1")
   ```

   或者如果索引名称不同：

   ```javascript
   db.users.dropIndex("users_email_key")
   ```

5. **创建新的复合唯一索引**

   ```javascript
   db.users.createIndex(
     { email: 1, provider: 1 },
     { unique: true, name: "users_email_provider_key" }
   )
   ```

6. **验证索引**

   ```javascript
   db.users.getIndexes()
   ```

   应该看到新的复合索引：

   ```javascript
   [
     { v: 2, key: { _id: 1 }, name: '_id_' },
     { v: 2, key: { userId: 1 }, name: 'userId_1', unique: true },
     { v: 2, key: { email: 1, provider: 1 }, name: 'users_email_provider_key', unique: true },  // ← 新的复合索引
     // ... 其他索引
   ]
   ```

### 方法 3：使用 MongoDB Compass

1. 打开 MongoDB Compass
2. 连接到你的数据库
3. 选择 `users` 集合
4. 点击 "Indexes" 标签
5. 找到旧的 `email` 唯一索引
6. 点击删除按钮删除它
7. 点击 "Create Index" 按钮
8. 添加复合索引：
   - Field: `email` (Ascending)
   - Field: `provider` (Ascending)
   - Options: 勾选 "Unique"

### 方法 4：使用 Prisma Migrate（如果支持）

对于 MongoDB，Prisma 的迁移支持有限。但你可以尝试：

```bash
npx prisma db push
```

这会根据 schema 更新数据库结构，但可能不会自动删除旧的索引。

## 验证修复

修复后，尝试使用 GitHub OAuth 登录：

1. 访问登录页面
2. 点击 "使用 GitHub 登入"
3. 授权后应该能正常创建用户并登录

如果仍然遇到错误，检查 Vercel 日志，应该不再看到 `users_email_key` 约束错误。

## 预防措施

1. **定期检查索引**：使用 `db.users.getIndexes()` 检查索引状态
2. **Schema 变更时同步更新数据库**：当修改 Prisma schema 时，确保数据库索引也相应更新
3. **使用版本控制**：记录数据库索引变更历史

## 相关文件

- `prisma/schema.prisma` - Prisma schema 定义
- `scripts/fix-database-indexes.ts` - 数据库索引修复脚本
- `src/app/api/auth/[...nextauth]/authOptions.ts` - OAuth 登录逻辑（包含错误处理）

## 常见问题

### Q: 为什么 Prisma 没有自动更新索引？

A: MongoDB 的 Prisma 支持有限，某些索引操作需要手动执行。特别是删除旧索引的操作，Prisma 不会自动处理。

### Q: 删除旧索引会影响现有数据吗？

A: 不会。删除索引只是删除索引本身，不会影响数据。但删除后，基于该索引的查询性能可能会下降（如果有的话）。

### Q: 如果我有多个环境（开发、生产），需要每个都修复吗？

A: 是的。每个环境的数据库都需要单独修复。确保在修复生产环境之前，先在开发环境测试。

### Q: 修复后还需要做什么？

A: 
1. 重新部署应用（如果需要）
2. 测试 OAuth 登录功能
3. 验证新用户创建是否正常
4. 检查日志确认没有索引相关错误

