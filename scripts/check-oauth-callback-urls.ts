/**
 * 检查 OAuth 回调 URL 配置脚本
 * 显示需要在 OAuth 提供商控制台中配置的回调 URL
 * 运行: npm run check-oauth-urls
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

console.log('🔗 OAuth 回调 URL 配置检查\n')
console.log('='.repeat(60))
console.log(`\n当前 NEXTAUTH_URL: ${NEXTAUTH_URL}\n`)

// NextAuth 使用的回调 URL 格式
const googleCallbackUrl = `${NEXTAUTH_URL}/api/auth/callback/google`
const githubCallbackUrl = `${NEXTAUTH_URL}/api/auth/callback/github`

console.log('📋 需要在 OAuth 提供商控制台中配置的回调 URL:\n')

console.log('1. Google OAuth (Google Cloud Console):')
console.log('   - 应用类型: Web 应用程序')
console.log('   - 已授权的 JavaScript 来源:')
console.log(`     ${NEXTAUTH_URL}`)
console.log('   - 已授权的重定向 URI:')
console.log(`     ${googleCallbackUrl}\n`)

console.log('2. GitHub OAuth (GitHub Developer Settings):')
console.log('   - Authorization callback URL:')
console.log(`     ${githubCallbackUrl}\n`)

console.log('='.repeat(60))
console.log('\n⚠️  重要提示:\n')
console.log('1. 确保 Google Cloud Console 中的回调 URL 完全匹配（包括 http/https）')
console.log('2. 确保 GitHub Developer Settings 中的回调 URL 完全匹配')
console.log('3. 如果使用 localhost，确保使用 http://（不是 https://）')
console.log('4. 如果使用生产环境，确保使用 https://')
console.log('5. 回调 URL 必须完全匹配，包括尾部斜杠（如果有）\n')

console.log('🔍 常见错误:\n')
console.log('- redirect_uri_mismatch: 回调 URL 不匹配')
console.log('  解决: 检查 Google Cloud Console 中的 "已授权的重定向 URI" 是否包含上述 URL')
console.log('- 确保 URL 中没有多余的空格或特殊字符')
console.log('- 确保协议（http/https）正确\n')

// 检查 URL 格式
if (!NEXTAUTH_URL.startsWith('http://') && !NEXTAUTH_URL.startsWith('https://')) {
  console.log('❌ 错误: NEXTAUTH_URL 必须以 http:// 或 https:// 开头\n')
  process.exit(1)
}

if (NEXTAUTH_URL.includes('localhost') && NEXTAUTH_URL.startsWith('https://')) {
  console.log('⚠️  警告: localhost 通常使用 http://，不是 https://\n')
}

console.log('✅ 回调 URL 格式检查通过\n')



