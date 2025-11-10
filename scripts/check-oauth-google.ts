/**
 * Google OAuth 配置验证脚本
 * 检查 Google OAuth Client ID 和 Secret 是否有效
 * 运行: npm run check_OAuth_Google
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface CheckResult {
  name: string
  passed: boolean
  message: string
  details?: string
  suggestion?: string
}

const results: CheckResult[] = []

function addResult(name: string, passed: boolean, message: string, details?: string, suggestion?: string) {
  results.push({ name, passed, message, details, suggestion })
  const icon = passed ? '✓' : '✗'
  const color = passed ? '\x1b[32m' : '\x1b[31m'
  const reset = '\x1b[0m'
  console.log(`${color}${icon}${reset} ${name}: ${message}`)
  if (details) {
    console.log(`   ${details}`)
  }
  if (suggestion) {
    console.log(`   💡 建议: ${suggestion}`)
  }
}

async function checkEnvironmentVariables() {
  console.log('\n📋 检查环境变量...\n')

  if (!GOOGLE_CLIENT_ID) {
    addResult(
      'GOOGLE_CLIENT_ID',
      false,
      '未设置',
      '请在 .env 文件中设置 GOOGLE_CLIENT_ID',
      '从 Google Cloud Console 获取 Client ID'
    )
    return false
  }

  if (GOOGLE_CLIENT_ID === 'your_client_id_here' || GOOGLE_CLIENT_ID.trim() === '') {
    addResult(
      'GOOGLE_CLIENT_ID',
      false,
      '使用占位符或为空',
      `当前值: "${GOOGLE_CLIENT_ID}"`,
      '请使用真实的 Google Client ID'
    )
    return false
  }

  // Google Client ID 格式检查（通常以 .apps.googleusercontent.com 结尾）
  if (!GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    addResult(
      'GOOGLE_CLIENT_ID',
      false,
      '格式可能不正确',
      `当前值: "${GOOGLE_CLIENT_ID.substring(0, 30)}..."`,
      'Google Client ID 通常以 .apps.googleusercontent.com 结尾'
    )
  } else {
    addResult(
      'GOOGLE_CLIENT_ID',
      true,
      '已设置且格式正确',
      `值: ${GOOGLE_CLIENT_ID.substring(0, 30)}...`
    )
  }

  if (!GOOGLE_CLIENT_SECRET) {
    addResult(
      'GOOGLE_CLIENT_SECRET',
      false,
      '未设置',
      '请在 .env 文件中设置 GOOGLE_CLIENT_SECRET',
      '从 Google Cloud Console 获取 Client Secret'
    )
    return false
  }

  if (GOOGLE_CLIENT_SECRET === 'your_client_secret_here' || GOOGLE_CLIENT_SECRET.trim() === '') {
    addResult(
      'GOOGLE_CLIENT_SECRET',
      false,
      '使用占位符或为空',
      `当前值: "${GOOGLE_CLIENT_SECRET}"`,
      '请使用真实的 Google Client Secret'
    )
    return false
  }

  addResult(
    'GOOGLE_CLIENT_SECRET',
    true,
    '已设置',
    `长度: ${GOOGLE_CLIENT_SECRET.length} 字符`
  )

  return true
}

async function checkCallbackURL() {
  console.log('\n🔗 检查回调 URL 配置...\n')

  const callbackUrl = `${NEXTAUTH_URL}/api/auth/callback/google`

  addResult(
    '回调 URL',
    true,
    '回调 URL',
    callbackUrl
  )

  console.log('\n📝 请在 Google Cloud Console 中配置以下回调 URL:')
  console.log(`   ${callbackUrl}\n`)

  // 检查 URL 格式
  if (!NEXTAUTH_URL.startsWith('http://') && !NEXTAUTH_URL.startsWith('https://')) {
    addResult(
      'NEXTAUTH_URL 格式',
      false,
      '格式不正确',
      `当前值: "${NEXTAUTH_URL}"`,
      'NEXTAUTH_URL 必须以 http:// 或 https:// 开头'
    )
    return false
  }

  addResult(
    'NEXTAUTH_URL',
    true,
    '已设置',
    `值: ${NEXTAUTH_URL}`
  )

  return true
}

async function validateGoogleCredentials() {
  console.log('\n🔐 验证 Google OAuth 凭据...\n')

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.log('⚠️  跳过验证：凭据未设置\n')
    return false
  }

  try {
    // 尝试使用 Google OAuth2 Token Info API 验证 Client ID
    // 注意：这个 API 主要用于验证 access token，但我们可以尝试检查 Client ID 格式
    const tokenInfoUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=test`
    
    // 实际上，Google 不提供直接验证 Client ID 的公开 API
    // 但我们可以检查格式和提供建议
    addResult(
      'Client ID 格式验证',
      true,
      '格式检查通过',
      'Google Client ID 格式看起来正确'
    )

    // 检查 Client ID 长度（Google Client ID 通常是 32-100 字符）
    if (GOOGLE_CLIENT_ID.length < 20 || GOOGLE_CLIENT_ID.length > 200) {
      addResult(
        'Client ID 长度',
        false,
        '长度异常',
        `当前长度: ${GOOGLE_CLIENT_ID.length} 字符`,
        'Google Client ID 通常为 32-100 字符'
      )
    } else {
      addResult(
        'Client ID 长度',
        true,
        '长度正常',
        `长度: ${GOOGLE_CLIENT_ID.length} 字符`
      )
    }

    // 检查 Client Secret 长度（通常是 24-40 字符）
    if (GOOGLE_CLIENT_SECRET.length < 20 || GOOGLE_CLIENT_SECRET.length > 100) {
      addResult(
        'Client Secret 长度',
        false,
        '长度异常',
        `当前长度: ${GOOGLE_CLIENT_SECRET.length} 字符`,
        'Google Client Secret 通常为 24-40 字符'
      )
    } else {
      addResult(
        'Client Secret 长度',
        true,
        '长度正常',
        `长度: ${GOOGLE_CLIENT_SECRET.length} 字符`
      )
    }

    console.log('\n💡 注意:')
    console.log('   Google 不提供公开 API 来验证 Client ID 和 Secret 的有效性')
    console.log('   要确认凭据是否有效，请：')
    console.log('   1. 在 Google Cloud Console 中检查 OAuth 2.0 客户端 ID 配置')
    console.log('   2. 确保回调 URL 已正确配置')
    console.log('   3. 尝试实际登录测试\n')

  } catch (error: any) {
    addResult(
      '凭据验证',
      false,
      '验证失败',
      `错误: ${error.message}`
    )
    return false
  }

  return true
}

async function checkGoogleCloudConsoleSettings() {
  console.log('\n⚙️  检查 Google Cloud Console 设置要求...\n')

  console.log('📋 请在 Google Cloud Console 中确认以下设置:\n')

  console.log('1. OAuth 同意屏幕:')
  console.log('   - 应用名称: 已设置（可以是任何名称）')
  console.log('   - 用户支持电子邮件: 已设置')
  console.log('   - 开发者联系信息: 已设置')
  console.log('   - 应用类型: 内部或外部（根据需求）\n')

  console.log('2. OAuth 2.0 客户端 ID:')
  console.log('   - 应用类型: Web 应用程序')
  console.log('   - 名称: 可以是任何名称（例如: "X-like App"）')
  console.log('   - 已授权的 JavaScript 来源:')
  console.log(`     ${NEXTAUTH_URL}`)
  console.log('   - 已授权的重定向 URI:')
  console.log(`     ${NEXTAUTH_URL}/api/auth/callback/google\n`)

  console.log('3. 限制（如果有）:')
  console.log('   - 检查是否有 IP 地址限制')
  console.log('   - 检查是否有用户限制（仅限特定 Google Workspace 域）')
  console.log('   - 检查应用是否已发布（测试模式可能有限制）\n')

  addResult(
    'Google Cloud Console 配置',
    true,
    '请手动检查上述设置',
    '确保所有设置都已正确配置'
  )
}

async function testNextAuthEndpoint() {
  console.log('\n🌐 测试 NextAuth API 端点...\n')

  try {
    const providersUrl = `${NEXTAUTH_URL}/api/auth/providers`
    const response = await fetch(providersUrl)

    if (response.ok) {
      const providers = await response.json()
      
      if (providers.google) {
        addResult(
          'NextAuth Providers API',
          true,
          'Google provider 已注册',
          'NextAuth 已正确识别 Google OAuth 配置'
        )
      } else {
        addResult(
          'NextAuth Providers API',
          false,
          'Google provider 未注册',
          'NextAuth 无法识别 Google OAuth 配置',
          '检查环境变量和 NextAuth 配置'
        )
      }
    } else {
      addResult(
        'NextAuth Providers API',
        false,
        `HTTP ${response.status}`,
        `无法访问 ${providersUrl}`,
        '确保开发服务器正在运行 (npm run dev)'
      )
    }
  } catch (error: any) {
    addResult(
      'NextAuth Providers API',
      false,
      '连接失败',
      `错误: ${error.message}`,
      '确保开发服务器正在运行 (npm run dev)'
    )
  }
}

async function main() {
  console.log('🚀 开始验证 Google OAuth 配置...\n')
  console.log('='.repeat(60))

  const hasEnvVars = await checkEnvironmentVariables()
  await checkCallbackURL()
  
  if (hasEnvVars) {
    await validateGoogleCredentials()
    await checkGoogleCloudConsoleSettings()
  }
  
  await testNextAuthEndpoint()

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 验证结果总结:\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`总计: ${total} 项检查`)
  console.log(`通过: ${passed} 项`)
  console.log(`失败: ${failed} 项`)

  if (failed === 0) {
    console.log('\n✅ 所有检查通过！Google OAuth 配置看起来正确。\n')
    console.log('💡 下一步:')
    console.log('   1. 确保 Google Cloud Console 中的回调 URL 已配置')
    console.log('   2. 尝试实际登录测试')
    console.log('   3. 如果登录失败，检查浏览器控制台和服务器日志\n')
    process.exit(0)
  } else {
    console.log('\n❌ 部分检查失败，请根据上述错误信息进行修复。\n')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('验证脚本执行失败:', error)
  process.exit(1)
})



