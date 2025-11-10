# 数据库清理脚本

这个目录包含用于在部署到 Vercel 之前清理数据库的脚本。

## 功能

在每次部署到 Vercel 时，自动清理数据库，只保留指定的 userID 及其相关数据。

## 文件说明

- `protected-userids.json` - 配置文件，包含要保留的 userID 列表
- `clean-database.ts` - 清理脚本，删除不在保护列表中的用户及其所有相关数据
- `list-userids.ts` - 列出数据库中所有 userID 的脚本
- `README.md` - 本说明文件

## 使用方法

### 0. 查看当前数据库中的所有 userID

在配置保护列表之前，可以先查看数据库中所有的 userID：

```bash
npm run db:list-ids
```

或直接使用 tsx：

```bash
npx tsx database/preprocess/list-userids.ts
```

这个命令会：
- 列出所有用户的详细信息（userID、名称、Email、登录方式）
- 显示所有 userID 的列表
- 生成可直接复制到 `protected-userids.json` 的 JSON 格式
- 显示统计信息（总用户数、按登录方式统计等）

### 1. 配置要保留的 userID

编辑 `protected-userids.json` 文件，在 `protectedUserIds` 数组中填入要保留的 userID：

```json
{
  "protectedUserIds": [
    "userA",
    "userB",
    "userC",
    "your-userid-here"
  ]
}
```

### 2. 运行清理脚本

#### 本地测试

```bash
npm run db:clean
```

或直接使用 tsx：

```bash
npx tsx database/preprocess/clean-database.ts
```

#### 在 Vercel 部署时自动运行

在 Vercel 项目设置中，修改构建命令：

**原构建命令：**
```bash
prisma generate && next build --webpack
```

**修改为：**
```bash
prisma generate && npm run db:clean && next build --webpack
```

或者，如果你想只在生产环境运行清理（推荐），可以修改 `package.json` 的 `build` 脚本：

```json
{
  "scripts": {
    "build": "prisma generate && npm run db:clean:prod && next build --webpack",
    "db:clean:prod": "NODE_ENV=production tsx database/preprocess/clean-database.ts"
  }
}
```

## 清理范围

脚本会删除以下数据（仅针对不在保护列表中的用户）：

1. **用户数据** (User)
2. **帖子** (Post) - 用户发布的所有帖子
3. **评论** (Comment) - 用户发布的所有评论
4. **点赞** (Like) - 用户的所有点赞记录
5. **转发** (Repost) - 用户的所有转发记录
6. **关注关系** (Follow) - 用户的所有关注和被关注关系
7. **草稿** (Draft) - 用户的所有草稿
8. **通知** (Notification) - 与用户相关的所有通知
9. **消息** (Message) - 用户发送和接收的所有消息

## 安全措施

- 脚本会先显示要删除的用户列表，让你确认
- 在生产环境（`NODE_ENV=production` 或 `VERCEL=1`）会自动跳过确认，直接执行
- 建议在运行前备份数据库

## 注意事项

⚠️ **警告：此操作不可逆！**

- 确保在 `protected-userids.json` 中正确配置了所有要保留的 userID
- 建议先在本地或测试环境运行，确认无误后再在生产环境使用
- 如果误删了重要数据，需要从备份恢复

## 示例输出

```
🧹 开始清理数据库...

📋 保护列表 (3 个 userID):
   1. userA
   2. userB
   3. userC

✅ 已连接到数据库

✅ 找到 3 个受保护的用户:
   - userA (MongoDB ID: 507f1f77bcf86cd799439011)
   - userB (MongoDB ID: 507f1f77bcf86cd799439012)
   - userC (MongoDB ID: 507f1f77bcf86cd799439013)

⚠️  找到 5 个需要删除的用户:
   - testuser1 (MongoDB ID: 507f1f77bcf86cd799439014)
   - testuser2 (MongoDB ID: 507f1f77bcf86cd799439015)
   ...

🗑️  开始删除相关数据...

   ✓ 删除 12 条消息
   ✓ 删除 45 条通知
   ✓ 删除 3 个草稿
   ✓ 删除 8 条转发
   ✓ 删除 23 个点赞
   ✓ 删除 15 个关注关系
   ✓ 删除 7 条评论
   ✓ 删除 5 篇帖子
   ✓ 删除 5 个用户

✨ 数据库清理完成！

📊 清理统计:
   - 保留用户: 3
   - 删除用户: 5
   - 删除帖子: 5
   - 删除评论: 7
   - 删除点赞: 23
   - 删除转发: 8
   - 删除关注: 15
   - 删除草稿: 3
   - 删除通知: 45
   - 删除消息: 12
```

## 故障排除

### 错误：无法读取 protected-userids.json

确保文件路径正确，且 JSON 格式有效。

### 错误：无法连接到数据库

检查 `DATABASE_URL` 环境变量是否正确设置，以及 MongoDB Atlas IP 白名单配置。

### 错误：删除失败

检查数据库连接和权限。确保 Prisma 客户端已正确生成（运行 `npm run db:generate`）。

