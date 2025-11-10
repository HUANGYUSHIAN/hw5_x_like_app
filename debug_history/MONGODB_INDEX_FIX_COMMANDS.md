# MongoDB 索引修复命令

根据你提供的索引列表，需要删除旧的 `users_email_key` 索引，并创建新的 `[email, provider]` 复合唯一索引。

## 快速修复（MongoDB Shell）

### 方法 1：使用 MongoDB Compass

1. 打开 MongoDB Compass
2. 连接到你的数据库
3. 选择 `users` 集合
4. 点击 "Indexes" 标签
5. 找到 `users_email_key` 索引
6. 点击删除按钮删除它
7. 点击 "Create Index" 按钮
8. 添加复合索引：
   - Field: `email` (Ascending)
   - Field: `provider` (Ascending)
   - Options: 勾选 "Unique"
   - Name: `users_email_provider_key`

### 方法 2：使用 MongoDB Shell 命令

连接到你的 MongoDB 数据库后，运行以下命令：

```javascript
// 1. 选择数据库（替换为你的数据库名）
use your-database-name

// 2. 查看当前索引
db.users.getIndexes()

// 3. 删除旧的 email 唯一索引
db.users.dropIndex("users_email_key")

// 4. 创建新的复合唯一索引
db.users.createIndex(
  { email: 1, provider: 1 },
  { unique: true, name: "users_email_provider_key" }
)

// 5. 验证索引
db.users.getIndexes()
```

### 方法 3：使用修复脚本

```bash
npm run fix-mongodb-indexes
```

## 预期结果

修复后，索引列表应该如下：

```
_id_                    - _id (默认索引)
users_userId_key         - userId (UNIQUE) ✓
users_email_provider_key - { email: 1, provider: 1 } (UNIQUE) ✓
```

**注意：** `users_email_key` 应该被删除，不再出现在列表中。

## 验证修复

修复后，尝试使用 GitHub OAuth 登录：

1. 访问登录页面
2. 点击 "使用 GitHub 登入"
3. 授权后应该能正常创建用户并登录

如果仍然遇到错误，检查 Vercel 日志，应该不再看到 `users_email_key` 约束错误。

## 常见问题

### Q: 删除索引会影响现有数据吗？

A: 不会。删除索引只是删除索引本身，不会影响数据。但删除后，基于该索引的查询性能可能会下降（如果有的话）。

### Q: 如果删除索引失败怎么办？

A: 检查是否有其他进程正在使用该索引，或者尝试使用 MongoDB Compass 的图形界面删除。

### Q: 创建复合索引失败怎么办？

A: 检查是否有重复的 `[email, provider]` 组合。如果有，需要先清理数据，或者暂时不设置 `unique: true`。

