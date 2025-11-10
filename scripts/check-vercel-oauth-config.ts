#!/usr/bin/env tsx
/**
 * 检查 Vercel 部署后的 OAuth 配置
 * 显示需要在 Vercel 和 OAuth 提供商中配置的内容
 */

const productionUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXTAUTH_URL || 'https://your-production-url.vercel.app'

console.log('🔍 Vercel OAuth 配置检查\n')
console.log('=' .repeat(60))

// 1. 检查 Vercel 环境变量
console.log('\n📋 1. Vercel 环境变量配置')
console.log('-' .repeat(60))
console.log('请在 Vercel Dashboard 中设置以下环境变量：\n')

console.log('必需的环境变量：')
console.log(`  NEXTAUTH_URL=${productionUrl}`)
console.log(`  NEXTAUTH_SECRET=<your-secret-key>`)
console.log(`  GOOGLE_CLIENT_ID=<your-google-client-id>`)
console.log(`  GOOGLE_CLIENT_SECRET=<your-google-client-secret>`)
console.log(`  GITHUB_ID=<your-github-client-id>`)
console.log(`  GITHUB_SECRET=<your-github-client-secret>`)
console.log(`  DATABASE_URL=<your-mongodb-connection-string>`)

console.log('\n💡 如何设置 Vercel 环境变量：')
console.log('  1. 访问 https://vercel.com/dashboard')
console.log('  2. 选择你的项目 (x_like_app)')
console.log('  3. 进入 Settings > Environment Variables')
console.log('  4. 添加上述所有环境变量')
console.log('  5. 确保选择正确的环境 (Production, Preview, Development)')
console.log('  6. 重新部署项目')

// 2. Google OAuth 配置
console.log('\n\n📋 2. Google OAuth 回调 URL 配置')
console.log('-' .repeat(60))
const googleCallbackUrl = `${productionUrl}/api/auth/callback/google`
console.log(`\n需要在 Google Cloud Console 中添加的回调 URL：`)
console.log(`  ${googleCallbackUrl}`)

console.log('\n💡 如何配置 Google OAuth：')
console.log('  1. 访问 https://console.cloud.google.com/apis/credentials')
console.log('  2. 选择你的 OAuth 2.0 客户端 ID')
console.log('  3. 在 "已授权的重定向 URI" 中添加：')
console.log(`     ${googleCallbackUrl}`)
console.log('  4. 如果本地开发也需要，同时添加：')
console.log('     http://localhost:3000/api/auth/callback/google')
console.log('  5. 保存更改')

// 3. GitHub OAuth 配置
console.log('\n\n📋 3. GitHub OAuth 回调 URL 配置')
console.log('-' .repeat(60))
const githubCallbackUrl = `${productionUrl}/api/auth/callback/github`
console.log(`\n需要在 GitHub Developer Settings 中添加的回调 URL：`)
console.log(`  ${githubCallbackUrl}`)

console.log('\n💡 如何配置 GitHub OAuth：')
console.log('  1. 访问 https://github.com/settings/developers')
console.log('  2. 选择你的 OAuth App')
console.log('  3. 在 "Authorization callback URL" 中添加：')
console.log(`     ${githubCallbackUrl}`)
console.log('  4. 如果本地开发也需要，可以添加多个 URL（用换行分隔）：')
console.log('     http://localhost:3000/api/auth/callback/github')
console.log(`     ${githubCallbackUrl}`)
console.log('  5. 保存更改')

// 4. 验证步骤
console.log('\n\n📋 4. 验证配置')
console.log('-' .repeat(60))
console.log('\n配置完成后，请执行以下步骤验证：')
console.log('  1. 在 Vercel Dashboard 中重新部署项目')
console.log('  2. 访问生产环境的登录页面')
console.log('  3. 尝试使用 Google/GitHub 登录')
console.log('  4. 检查浏览器控制台和 Vercel 日志是否有错误')

// 5. 常见问题
console.log('\n\n📋 5. 常见问题排查')
console.log('-' .repeat(60))
console.log('\n如果 OAuth 仍然不工作，请检查：')
console.log('  ✓ NEXTAUTH_URL 是否正确设置为生产环境 URL（不带尾部斜杠）')
console.log('  ✓ OAuth 提供商中的回调 URL 是否完全匹配（包括 https://）')
console.log('  ✓ 环境变量是否在正确的环境中设置（Production）')
console.log('  ✓ 是否在设置环境变量后重新部署了项目')
console.log('  ✓ Vercel 日志中是否有错误信息')

console.log('\n' + '=' .repeat(60))
console.log('✅ 配置检查完成！\n')


