/**
 * OAuth 错误诊断脚本
 * 诊断 redirect_uri_mismatch 和 Configuration 错误
 * 运行: npm run diagnose-oauth
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const NEXTAUTH_URL = process.env.NEXTAUTH_URL
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET

console.log('🔍 OAuth 错误诊断\n')
console.log('='.repeat(60))

// 检查 NEXTAUTH_URL
console.log('\n1. 检查 NEXTAUTH_URL:\n')
if (!NEXTAUTH_URL) {
  console.log('❌ NEXTAUTH_URL 未设置')
  console.log('   这是导致 Configuration 错误的主要原因！')
  console.log('   请在 .env 文件中添加:')
  console.log('   NEXTAUTH_URL=http://localhost:3000\n')
} else {
  console.log(`✓ NEXTAUTH_URL: ${NEXTAUTH_URL}`)
  
  // 检查格式
  if (!NEXTAUTH_URL.startsWith('http://') && !NEXTAUTH_URL.startsWith('https://')) {
    console.log('❌ 格式错误: 必须以 http:// 或 https:// 开头\n')
  } else if (NEXTAUTH_URL.includes('localhost') && NEXTAUTH_URL.startsWith('https://')) {
    console.log('⚠️  警告: localhost 通常使用 http://，不是 https://\n')
  } else {
    console.log('✓ 格式正确\n')
  }
  
  // 检查尾部斜杠
  if (NEXTAUTH_URL.endsWith('/')) {
    console.log('⚠️  警告: NEXTAUTH_URL 不应以斜杠结尾')
    console.log(`   当前: ${NEXTAUTH_URL}`)
    console.log(`   应该是: ${NEXTAUTH_URL.slice(0, -1)}\n`)
  }
}

// 检查 NEXTAUTH_SECRET
console.log('2. 检查 NEXTAUTH_SECRET:\n')
if (!NEXTAUTH_SECRET) {
  console.log('❌ NEXTAUTH_SECRET 未设置')
  console.log('   这也是导致 Configuration 错误的原因！')
  console.log('   请在 .env 文件中添加:')
  console.log('   NEXTAUTH_SECRET=your_random_secret_here\n')
} else if (NEXTAUTH_SECRET === 'your_random_secret_here' || NEXTAUTH_SECRET.length < 32) {
  console.log('⚠️  NEXTAUTH_SECRET 使用占位符或长度不足')
  console.log(`   当前长度: ${NEXTAUTH_SECRET.length}`)
  console.log('   建议使用至少 32 字符的随机字符串\n')
} else {
  console.log(`✓ NEXTAUTH_SECRET: 已设置 (长度: ${NEXTAUTH_SECRET.length})\n`)
}

// 显示回调 URL
console.log('3. OAuth 回调 URL:\n')
if (NEXTAUTH_URL) {
  const googleCallbackUrl = `${NEXTAUTH_URL}/api/auth/callback/google`
  const githubCallbackUrl = `${NEXTAUTH_URL}/api/auth/callback/github`
  
  console.log('Google 回调 URL:')
  console.log(`  ${googleCallbackUrl}\n`)
  
  console.log('GitHub 回调 URL:')
  console.log(`  ${githubCallbackUrl}\n`)
  
  console.log('='.repeat(60))
  console.log('\n📋 配置步骤:\n')
  
  console.log('Google Cloud Console:')
  console.log('1. 访问 https://console.cloud.google.com/apis/credentials')
  console.log('2. 找到你的 OAuth 2.0 客户端 ID')
  console.log('3. 点击编辑')
  console.log('4. 在 "已授权的重定向 URI" 中添加:')
  console.log(`   ${googleCallbackUrl}`)
  console.log('5. 确保 "已授权的 JavaScript 来源" 包含:')
  console.log(`   ${NEXTAUTH_URL}\n`)
  
  console.log('GitHub Developer Settings:')
  console.log('1. 访问 https://github.com/settings/developers')
  console.log('2. 找到你的 OAuth App')
  console.log('3. 点击编辑')
  console.log('4. 在 "Authorization callback URL" 中输入:')
  console.log(`   ${githubCallbackUrl}\n`)
  
} else {
  console.log('⚠️  无法显示回调 URL（NEXTAUTH_URL 未设置）\n')
}

// 常见错误解决方案
console.log('='.repeat(60))
console.log('\n💡 常见错误解决方案:\n')

console.log('错误: redirect_uri_mismatch')
console.log('原因: Google Cloud Console 中的回调 URL 与 NextAuth 使用的不匹配')
console.log('解决:')
console.log('  1. 运行: npm run check-oauth-urls')
console.log('  2. 复制显示的回调 URL')
console.log('  3. 在 Google Cloud Console 中完全匹配地配置\n')

console.log('错误: Configuration')
console.log('原因: NextAuth 配置缺少必需字段（通常是 NEXTAUTH_URL 或 NEXTAUTH_SECRET）')
console.log('解决:')
console.log('  1. 确保 .env 文件中有 NEXTAUTH_URL=http://localhost:3000')
console.log('  2. 确保 .env 文件中有 NEXTAUTH_SECRET=your_secret')
console.log('  3. 重启开发服务器\n')

console.log('='.repeat(60))
console.log('\n✅ 诊断完成\n')



