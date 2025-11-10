/**
 * 验证 Google OAuth 配置脚本
 * 检查 NextAuth 实际使用的回调 URL 和 Google Cloud Console 配置
 * 运行: npm run verify-google-oauth
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const NEXTAUTH_URL = process.env.NEXTAUTH_URL
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

console.log('🔍 验证 Google OAuth 配置\n')
console.log('='.repeat(70))

// 1. 检查环境变量
console.log('\n1. 环境变量检查:\n')
let hasErrors = false

if (!NEXTAUTH_URL) {
  console.log('❌ NEXTAUTH_URL 未设置')
  hasErrors = true
} else {
  console.log(`✓ NEXTAUTH_URL: ${NEXTAUTH_URL}`)
  
  // 检查格式
  if (NEXTAUTH_URL.endsWith('/')) {
    console.log('⚠️  警告: NEXTAUTH_URL 不应以斜杠结尾')
    console.log(`   当前: ${NEXTAUTH_URL}`)
    console.log(`   应该是: ${NEXTAUTH_URL.slice(0, -1)}`)
  }
  
  if (!NEXTAUTH_URL.startsWith('http://') && !NEXTAUTH_URL.startsWith('https://')) {
    console.log('❌ NEXTAUTH_URL 格式错误: 必须以 http:// 或 https:// 开头')
    hasErrors = true
  }
}

if (!GOOGLE_CLIENT_ID) {
  console.log('❌ GOOGLE_CLIENT_ID 未设置')
  hasErrors = true
} else {
  console.log(`✓ GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`)
}

if (!GOOGLE_CLIENT_SECRET) {
  console.log('❌ GOOGLE_CLIENT_SECRET 未设置')
  hasErrors = true
} else {
  console.log(`✓ GOOGLE_CLIENT_SECRET: 已设置 (长度: ${GOOGLE_CLIENT_SECRET.length})`)
}

if (hasErrors) {
  console.log('\n❌ 环境变量配置有误，请先修复上述问题')
  process.exit(1)
}

// 2. 计算正确的回调 URL
console.log('\n2. NextAuth 使用的回调 URL:\n')
const callbackUrl = `${NEXTAUTH_URL}/api/auth/callback/google`
console.log(`回调 URL: ${callbackUrl}`)
console.log(`\n⚠️  这个 URL 必须完全匹配 Google Cloud Console 中的配置`)

// 3. 检查 URL 格式
console.log('\n3. URL 格式验证:\n')
const urlParts = {
  protocol: callbackUrl.match(/^(https?):\/\//)?.[1] || '未找到',
  host: callbackUrl.match(/https?:\/\/([^\/]+)/)?.[1] || '未找到',
  path: callbackUrl.match(/https?:\/\/[^\/]+(\/.*)/)?.[1] || '未找到',
}

console.log(`协议: ${urlParts.protocol}`)
console.log(`主机: ${urlParts.host}`)
console.log(`路径: ${urlParts.path}`)

// 验证格式
const issues: string[] = []

if (urlParts.protocol === 'https' && urlParts.host.includes('localhost')) {
  issues.push('⚠️  localhost 通常使用 http://，不是 https://')
}

if (urlParts.host.includes('127.0.0.1')) {
  issues.push('⚠️  建议使用 localhost，而不是 127.0.0.1')
}

if (!urlParts.host.includes(':')) {
  issues.push('⚠️  缺少端口号（例如 :3000）')
}

if (urlParts.path !== '/api/auth/callback/google') {
  issues.push(`⚠️  路径应该是 /api/auth/callback/google，当前是: ${urlParts.path}`)
}

if (callbackUrl.endsWith('/')) {
  issues.push('⚠️  回调 URL 不应以斜杠结尾')
}

if (issues.length > 0) {
  console.log('\n发现的问题:')
  issues.forEach(issue => console.log(`  ${issue}`))
} else {
  console.log('\n✓ URL 格式正确')
}

// 4. 提供配置步骤
console.log('\n' + '='.repeat(70))
console.log('\n📋 Google Cloud Console 配置步骤:\n')

console.log('1. 访问: https://console.cloud.google.com/apis/credentials')
console.log('2. 确保选择了正确的项目')
console.log('3. 找到你的 OAuth 2.0 客户端 ID（应该与 GOOGLE_CLIENT_ID 匹配）')
console.log('4. 点击编辑（铅笔图标）')
console.log('\n5. 在 "已授权的重定向 URI" 部分:')
console.log('   - 点击 "+ 添加 URI"')
console.log('   - 输入（必须完全匹配）:')
console.log(`   ${callbackUrl}`)
console.log('   - 点击 "添加"')
console.log('\n6. 在 "已授权的 JavaScript 来源" 部分:')
console.log('   - 点击 "+ 添加 URI"')
console.log('   - 输入:')
console.log(`   ${NEXTAUTH_URL}`)
console.log('   - 点击 "添加"')
console.log('\n7. 滚动到底部，点击 "保存"')
console.log('8. 等待 1-5 分钟让更改生效')

// 5. 检查应用类型
console.log('\n' + '='.repeat(70))
console.log('\n⚠️  重要检查项:\n')

console.log('1. 应用类型:')
console.log('   - 在 Google Cloud Console 中，确保应用类型是 "Web 应用程序"')
console.log('   - 不是 "桌面应用程序" 或 "移动应用程序"')

console.log('\n2. OAuth 同意屏幕:')
console.log('   - 确保 OAuth 同意屏幕已正确配置')
console.log('   - 访问: https://console.cloud.google.com/apis/credentials/consent')

console.log('\n3. 客户端 ID 匹配:')
console.log('   - 确保 Google Cloud Console 中的客户端 ID 与 .env 文件中的 GOOGLE_CLIENT_ID 完全匹配')
console.log('   - 包括大小写和所有字符')

console.log('\n4. 项目状态:')
console.log('   - 确保项目已启用必要的 API')
console.log('   - 访问: https://console.cloud.google.com/apis/library')

// 6. 常见错误
console.log('\n' + '='.repeat(70))
console.log('\n💡 常见错误和解决方案:\n')

console.log('错误: redirect_uri_mismatch')
console.log('原因:')
console.log('  - Google Cloud Console 中的回调 URL 与上述 URL 不匹配')
console.log('  - 或者回调 URL 格式不正确')
console.log('解决:')
console.log('  1. 复制上述回调 URL（完全匹配）')
console.log('  2. 在 Google Cloud Console 中粘贴（不要手动输入）')
console.log('  3. 确保没有多余的空格或字符')
console.log('  4. 保存后等待几分钟')

console.log('\n错误: invalid_request')
console.log('原因:')
console.log('  - 应用类型配置错误（应该是 "Web 应用程序"）')
console.log('  - OAuth 同意屏幕未配置')
console.log('  - 客户端 ID 或 Secret 错误')
console.log('解决:')
console.log('  1. 检查应用类型是否为 "Web 应用程序"')
console.log('  2. 配置 OAuth 同意屏幕')
console.log('  3. 验证客户端 ID 和 Secret 是否正确')

console.log('\n错误: OOB (Out-of-Band) 流程已淘汰')
console.log('原因:')
console.log('  - 使用了已淘汰的 OOB 回调 URL')
console.log('解决:')
console.log('  - 确保使用上述格式的回调 URL')
console.log('  - 不要使用 urn:ietf:wg:oauth:2.0:oob 或其他 OOB 格式')

console.log('\n' + '='.repeat(70))
console.log('\n✅ 验证完成\n')
console.log('如果问题仍然存在，请:')
console.log('1. 检查 Google Cloud Console 中的配置是否完全匹配上述 URL')
console.log('2. 清除浏览器缓存和 Cookie')
console.log('3. 等待 5 分钟后重试')
console.log('4. 使用隐私模式（无痕模式）测试\n')



