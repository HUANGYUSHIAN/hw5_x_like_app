# Vercel 部署配置指南

本指南说明如何在 Vercel 部署时自动运行数据库清理脚本。

## 方法 1：修改构建命令（推荐）

在 Vercel 项目设置中：

1. 进入 **Settings** → **General** → **Build & Development Settings**
2. 找到 **Build Command**
3. 修改为：

```bash
prisma generate && npm run db:clean && next build --webpack
```

这样每次部署时都会：
1. 生成 Prisma 客户端
2. 运行数据库清理脚本（只保留 `protected-userids.json` 中指定的用户）
3. 构建 Next.js 应用

## 方法 2：使用环境变量控制

如果你只想在生产环境运行清理，可以：

1. 在 Vercel 环境变量中设置 `RUN_DB_CLEAN=true`
2. 修改 `package.json` 的 `build` 脚本：

```json
{
  "scripts": {
    "build": "prisma generate && (if [ \"$RUN_DB_CLEAN\" = \"true\" ]; then npm run db:clean; fi) && next build --webpack"
  }
}
```

或者创建一个新的脚本：

```json
{
  "scripts": {
    "build": "prisma generate && npm run db:clean:conditional && next build --webpack",
    "db:clean:conditional": "if [ \"$RUN_DB_CLEAN\" = \"true\" ]; then npm run db:clean; else echo '跳过数据库清理 (RUN_DB_CLEAN 未设置)'; fi"
  }
}
```

## 方法 3：使用 Vercel Build Hook

如果你不想在每次部署时都清理数据库，可以：

1. 创建一个单独的 API 路由 `/api/admin/clean-database`
2. 使用 Vercel Build Hook 在需要时触发清理
3. 在 API 路由中调用清理脚本

## 重要注意事项

⚠️ **警告：**

1. **数据库连接**：确保 Vercel 环境变量中正确设置了 `DATABASE_URL`
2. **IP 白名单**：如果使用 MongoDB Atlas，确保 Vercel 的 IP 地址在白名单中，或者允许所有 IP（0.0.0.0/0）
3. **执行时间**：清理脚本可能需要一些时间，特别是当数据库很大时。Vercel 的构建超时时间是 45 分钟，通常足够
4. **错误处理**：如果清理失败，构建会失败。确保 `protected-userids.json` 中的 userID 都是有效的

## 测试部署

在正式部署前，建议：

1. 在本地测试清理脚本：`npm run db:clean`
2. 检查 `protected-userids.json` 中的 userID 是否正确
3. 在 Vercel 的预览部署中测试，确认清理脚本正常工作
4. 确认清理后的数据库状态符合预期

## 故障排除

### 构建失败：无法连接到数据库

- 检查 `DATABASE_URL` 环境变量是否正确设置
- 检查 MongoDB Atlas IP 白名单设置
- 检查网络连接

### 构建失败：找不到 protected-userids.json

- 确保文件已提交到 Git 仓库
- 检查文件路径是否正确：`database/preprocess/protected-userids.json`

### 构建超时

- 如果数据库很大，清理可能需要较长时间
- 考虑分批清理，或只在必要时运行清理脚本

