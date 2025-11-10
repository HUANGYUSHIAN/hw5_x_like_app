/**
 * GitHub OAuth 配置验证脚本
 * 检查 GitHub OAuth Client ID 和 Secret 是否有效
 * 运行: npm run check_OAuth_Github
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const GITHUB_ID = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID
const GITHUB_SECRET = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET
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

  if (!GITHUB_ID) {
    addResult(
      'GITHUB_ID',
      false,
      '未设置',
      '请在 .env 文件中设置 GITHUB_ID',
      '从 GitHub Developer Settings 获取 Client ID'
    )
    return false
  }

  if (GITHUB_ID === 'your_github_client_id_here' || GITHUB_ID.trim() === '') {
    addResult(
      'GITHUB_ID',
      false,
      '使用占位符或为空',
      `当前值: "${GITHUB_ID}"`,
      '请使用真实的 GitHub Client ID'
    )
    return false
  }

  // GitHub Client ID 格式检查
  // 新格式: Iv1.xxxxxxxxxxxxxxxx (以 Iv1. 开头，后跟字母数字)
  // 旧格式: 20 位随机英数（字母和数字的组合，不一定是十六进制）
  const isNewFormat = /^Iv1\.[a-zA-Z0-9]+$/i.test(GITHUB_ID)
  const isOldFormat = /^[a-zA-Z0-9]{20}$/i.test(GITHUB_ID)
  
  if (!isNewFormat && !isOldFormat) {
    addResult(
      'GITHUB_ID',
      false,
      '格式可能不正确',
      `当前值: "${GITHUB_ID}"`,
      'GitHub Client ID 格式: 新格式 (Iv1.xxx...) 或旧格式 (20位随机英数，例如: Ov23liXXlZ5arb15CgQo)'
    )
  } else {
    const format = isNewFormat ? '新格式 (Iv1.xxx...)' : '旧格式 (20位随机英数)'
    addResult(
      'GITHUB_ID',
      true,
      `已设置且格式正确 (${format})`,
      `值: ${GITHUB_ID.substring(0, 15)}...`
    )
  }

  if (!GITHUB_SECRET) {
    addResult(
      'GITHUB_SECRET',
      false,
      '未设置',
      '请在 .env 文件中设置 GITHUB_SECRET',
      '从 GitHub Developer Settings 获取 Client Secret'
    )
    return false
  }

  if (GITHUB_SECRET === 'your_github_client_secret_here' || GITHUB_SECRET.trim() === '') {
    addResult(
      'GITHUB_SECRET',
      false,
      '使用占位符或为空',
      `当前值: "${GITHUB_SECRET}"`,
      '请使用真实的 GitHub Client Secret'
    )
    return false
  }

  // GitHub Client Secret 格式检查
  // GitHub Client Secret 通常是 40 字符的字母数字组合（不一定是纯十六进制）
  // 可能是十六进制，也可能是其他字母数字组合
  if (!/^[a-zA-Z0-9]{40}$/i.test(GITHUB_SECRET)) {
    addResult(
      'GITHUB_SECRET',
      false,
      '格式可能不正确',
      `当前值: "${GITHUB_SECRET.substring(0, 10)}..."`,
      'GitHub Client Secret 通常是 40 字符的字母数字组合'
    )
  } else {
    addResult(
      'GITHUB_SECRET',
      true,
      '已设置且格式正确',
      `长度: ${GITHUB_SECRET.length} 字符`
    )
  }

  return true
}

async function checkCallbackURL() {
  console.log('\n🔗 检查回调 URL 配置...\n')

  const callbackUrl = `${NEXTAUTH_URL}/api/auth/callback/github`

  addResult(
    '回调 URL',
    true,
    '回调 URL',
    callbackUrl
  )

  console.log('\n📝 请在 GitHub Developer Settings 中配置以下回调 URL:')
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

async function validateGitHubCredentials() {
  console.log('\n🔐 验证 GitHub OAuth 凭据...\n')

  if (!GITHUB_ID || !GITHUB_SECRET) {
    console.log('⚠️  跳过验证：凭据未设置\n')
    return false
  }

  try {
    // GitHub 不提供直接验证 Client ID 的公开 API
    // 但我们可以检查格式和提供建议
    
    // 检查 Client ID 长度
    // 新格式: Iv1.xxxxxxxxxxxxxxxx (通常 20+ 字符)
    // 旧格式: 20 位随机英数
    const isNewFormat = /^Iv1\.[a-zA-Z0-9]+$/i.test(GITHUB_ID)
    const isOldFormat = /^[a-zA-Z0-9]{20}$/i.test(GITHUB_ID)
    
    if (isOldFormat && GITHUB_ID.length !== 20) {
      addResult(
        'Client ID 长度',
        false,
        '长度异常',
        `当前长度: ${GITHUB_ID.length} 字符`,
        '旧格式 GitHub Client ID 必须为 20 字符'
      )
    } else if (isNewFormat && GITHUB_ID.length < 20) {
      addResult(
        'Client ID 长度',
        false,
        '长度异常',
        `当前长度: ${GITHUB_ID.length} 字符`,
        '新格式 GitHub Client ID (Iv1.xxx...) 通常为 20+ 字符'
      )
    } else if (!isNewFormat && !isOldFormat) {
      // 如果格式不匹配，但长度在合理范围内，给出警告
      if (GITHUB_ID.length < 15 || GITHUB_ID.length > 50) {
        addResult(
          'Client ID 长度',
          false,
          '长度异常',
          `当前长度: ${GITHUB_ID.length} 字符`,
          'GitHub Client ID 通常为 20 字符（旧格式）或 20+ 字符（新格式 Iv1.xxx...）'
        )
      } else {
        addResult(
          'Client ID 长度',
          true,
          '长度正常',
          `长度: ${GITHUB_ID.length} 字符`
        )
      }
    } else {
      addResult(
        'Client ID 长度',
        true,
        '长度正常',
        `长度: ${GITHUB_ID.length} 字符`
      )
    }

    // 检查 Client Secret 长度（通常是 40 字符）
    if (GITHUB_SECRET.length < 30 || GITHUB_SECRET.length > 100) {
      addResult(
        'Client Secret 长度',
        false,
        '长度异常',
        `当前长度: ${GITHUB_SECRET.length} 字符`,
        'GitHub Client Secret 通常为 40 字符'
      )
    } else {
      addResult(
        'Client Secret 长度',
        true,
        '长度正常',
        `长度: ${GITHUB_SECRET.length} 字符`
      )
    }

    console.log('\n💡 注意:')
    console.log('   GitHub 不提供公开 API 来验证 Client ID 和 Secret 的有效性')
    console.log('   要确认凭据是否有效，请：')
    console.log('   1. 在 GitHub Developer Settings 中检查 OAuth App 配置')
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

async function checkGitHubDeveloperSettings() {
  console.log('\n⚙️  检查 GitHub Developer Settings 要求...\n')

  console.log('📋 请在 GitHub Developer Settings 中确认以下设置:\n')

  console.log('1. OAuth App 基本信息:')
  console.log('   - Application name: 可以是任何名称（例如: "X-like App"）')
  console.log('   - Homepage URL:')
  console.log(`     ${NEXTAUTH_URL}`)
  console.log('   - Application description: 可选（可以是任何描述）\n')

  console.log('2. 回调 URL:')
  console.log('   - Authorization callback URL:')
  console.log(`     ${NEXTAUTH_URL}/api/auth/callback/github\n`)

  console.log('3. 限制（如果有）:')
  console.log('   - 检查是否有用户限制（仅限特定组织或用户）')
  console.log('   - 检查应用是否已启用\n')

  console.log('4. 权限范围:')
  console.log('   - NextAuth 默认请求: user:email, read:user')
  console.log('   - 这些是基本权限，通常不需要额外配置\n')

  addResult(
    'GitHub Developer Settings 配置',
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
      
      if (providers.github) {
        addResult(
          'NextAuth Providers API',
          true,
          'GitHub provider 已注册',
          'NextAuth 已正确识别 GitHub OAuth 配置'
        )
      } else {
        addResult(
          'NextAuth Providers API',
          false,
          'GitHub provider 未注册',
          'NextAuth 无法识别 GitHub OAuth 配置',
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
  console.log('🚀 开始验证 GitHub OAuth 配置...\n')
  console.log('='.repeat(60))

  const hasEnvVars = await checkEnvironmentVariables()
  await checkCallbackURL()
  
  if (hasEnvVars) {
    await validateGitHubCredentials()
    await checkGitHubDeveloperSettings()
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
    console.log('\n✅ 所有检查通过！GitHub OAuth 配置看起来正确。\n')
    console.log('💡 下一步:')
    console.log('   1. 确保 GitHub Developer Settings 中的回调 URL 已配置')
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

