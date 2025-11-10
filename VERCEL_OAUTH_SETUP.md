# Vercel OAuth 配置指南

## 问题说明

部署到 Vercel 后，OAuth 登录失败，因为回调 URL 仍然指向 `localhost:3000`。

## 解决方案

### 步骤 1: 获取你的 Vercel 生产 URL

你的生产环境 URL 是：
```
https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app
```

或者如果你配置了自定义域名，使用你的自定义域名。

### 步骤 2: 在 Vercel 中设置环境变量

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 `x_like_app`
3. 进入 **Settings** > **Environment Variables**
4. 添加以下环境变量（确保选择 **Production** 环境）：

```
NEXTAUTH_URL=https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app
NEXTAUTH_SECRET=<你的密钥>
GOOGLE_CLIENT_ID=<你的 Google Client ID>
GOOGLE_CLIENT_SECRET=<你的 Google Client Secret>
GITHUB_ID=<你的 GitHub Client ID>
GITHUB_SECRET=<你的 GitHub Client Secret>
DATABASE_URL=<你的 MongoDB 连接字符串>
```

**重要提示：**
- `NEXTAUTH_URL` 必须是完整的 URL，**不要**包含尾部斜杠
- 确保所有环境变量都设置为 **Production** 环境
- 设置完成后，**必须重新部署**项目

### 步骤 3: 配置 Google OAuth 回调 URL

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 选择你的 OAuth 2.0 客户端 ID
3. 在 **"已授权的重定向 URI"** 中添加：

```
https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app/api/auth/callback/google
```

4. 如果本地开发也需要，同时添加：
```
http://localhost:3000/api/auth/callback/google
```

5. 点击 **保存**

### 步骤 4: 配置 GitHub OAuth 回调 URL

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 选择你的 OAuth App
3. 在 **"Authorization callback URL"** 中添加：

```
https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app/api/auth/callback/github
```

4. 如果本地开发也需要，可以添加多个 URL（用换行分隔）：
```
http://localhost:3000/api/auth/callback/github
https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app/api/auth/callback/github
```

5. 点击 **Update application**

### 步骤 5: 重新部署项目

在 Vercel Dashboard 中：
1. 进入你的项目
2. 点击 **Deployments** 标签
3. 找到最新的部署，点击 **...** 菜单
4. 选择 **Redeploy**

或者使用命令行：
```bash
vercel --prod
```

### 步骤 6: 验证配置

1. 访问你的生产环境登录页面：
   ```
   https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app/auth/signin
   ```

2. 尝试使用 Google 或 GitHub 登录

3. 如果遇到问题，检查：
   - Vercel 部署日志（在 Vercel Dashboard > Deployments > 选择部署 > Logs）
   - 浏览器控制台错误
   - 网络请求（检查回调 URL 是否正确）

## 快速检查脚本

运行以下命令查看需要配置的内容：

```bash
npm run check-vercel-oauth
```

## 常见问题

### Q: 为什么还是跳转到 localhost？

**A:** 检查 `NEXTAUTH_URL` 环境变量是否正确设置，并且已经重新部署。

### Q: 如何确认环境变量已设置？

**A:** 在 Vercel Dashboard > Settings > Environment Variables 中查看。确保选择了正确的环境（Production）。

### Q: 回调 URL 必须完全匹配吗？

**A:** 是的，必须完全匹配，包括协议（https://）和路径。

### Q: 可以同时支持本地和生产环境吗？

**A:** 可以。在 OAuth 提供商中添加两个回调 URL：
- `http://localhost:3000/api/auth/callback/google` (本地)
- `https://xlike-15tsp7zcw-yushianhuangs-projects.vercel.app/api/auth/callback/google` (生产)

### Q: 如何获取 NEXTAUTH_SECRET？

**A:** 可以使用以下命令生成：
```bash
openssl rand -base64 32
```

或者访问：https://generate-secret.vercel.app/32

## 需要帮助？

如果仍然遇到问题，请检查：
1. Vercel 部署日志
2. 浏览器控制台错误
3. OAuth 提供商的错误日志
4. 确保所有环境变量都已正确设置


