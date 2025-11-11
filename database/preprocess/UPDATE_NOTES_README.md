# 更新说明功能使用指南

## 功能说明

在登录页面（`/auth/signin`）顶部会显示一个更新说明栏，用于向用户展示最新的更新内容。

## 使用方法

### 1. 编辑更新说明

编辑 `database/preprocess/update-notes.txt` 文件，直接输入或粘贴更新内容。

**格式要求：**
- 每行一个说明点
- 自动换行（每行会单独显示）
- 支持超链接自动识别（`http://`、`https://` 或 `www.` 开头的 URL 会自动转换为可点击链接）
- 内容不超过 10 句话（建议）

### 2. 示例

```
本次更新如下:

排除Github與Google OAuth因相同email導致唯一性衝突而觸發redirect回登入頁面

初次登入修改userID或是修改userID成功後會自動登入，請重新登入

登入demo:https://www.youtube.com/
```

### 3. 部署

- 编辑 `update-notes.txt` 文件后，提交到 Git
- 部署到 Vercel 后，更新说明会自动显示在登录页面
- 如果文件为空或不存在，说明栏不会显示

## 技术实现

- **存储位置**: `database/preprocess/update-notes.txt`
- **API 路由**: `/api/update-notes`
- **组件**: `src/components/UpdateNotes.tsx`
- **显示位置**: 登录页面标题下方

## 注意事项

- 文件内容会在每次页面加载时从服务器读取
- 不需要数据库存储，直接读取文件
- 超链接会自动在新标签页打开
- 如果内容为空，说明栏不会显示



