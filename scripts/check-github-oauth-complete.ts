/**
 * GitHub OAuth 完整配置检查脚本
 * 支持本地和 Vercel 环境
 * 
 * 使用方法：
 *   npm run check-github-oauth
 *   或
 *   npx tsx scripts/check-github-oauth-complete.ts
 * 
 * 环境变量：
 *   - 本地：从 .env 或 .env.local 读取
 *   - Vercel：确保 Vercel 环境变量与本地 .env 一致
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const GITHUB_ID = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID
const GITHUB_SECRET = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET

// 从命令行参数获取 Vercel URL（可选）
const vercelUrl = process.argv[2] || process.env.VERCEL_URL || null

interface CheckResult {
  name: string
  passed: boolean
  message: string
  details?: string
  suggestion?: string
  warning?: boolean
}

const results: CheckResult[] = []

function addResult(
  name: string,
  passed: boolean,
  message: string,
  details?: string,
  suggestion?: string,
  warning?: boolean
) {
  results.push({ name, passed, message, details, suggestion, warning })
  const icon = passed ? '✓' : (warning ? '⚠' : '✗')
  const color = passed ? '\x1b[32m' : (warning ? '\x1b[33m' : '\x1b[31m')
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
  console.log('\n📋 检查环境变量配置...\n')

  // 检查 GITHUB_ID
  if (!GITHUB_ID) {
    addResult(
      'GITHUB_ID',
      false,
      '未设置',
      '请在 .env 文件中设置 GITHUB_ID 或 GITHUB_CLIENT_ID',
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
  const isNewFormat = /^Iv1\.[a-zA-Z0-9]+$/i.test(GITHUB_ID)
  const isOldFormat = /^[a-zA-Z0-9]{20}$/i.test(GITHUB_ID)
  
  if (!isNewFormat && !isOldFormat) {
    addResult(
      'GITHUB_ID 格式',
      false,
      '格式可能不正确',
      `当前值: "${GITHUB_ID.substring(0, 15)}..."`,
      'GitHub Client ID 格式: 新格式 (Iv1.xxx...) 或旧格式 (20位随机英数)'
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

  // 检查 GITHUB_SECRET
  if (!GITHUB_SECRET) {
    addResult(
      'GITHUB_SECRET',
      false,
      '未设置',
      '请在 .env 文件中设置 GITHUB_SECRET 或 GITHUB_CLIENT_SECRET',
      '从 GitHub Developer Settings 获取 Client Secret'
    )
    return false
  }

  if (GITHUB_SECRET === 'your_github_client_secret_here' || GITHUB_SECRET.trim() === '') {
    addResult(
      'GITHUB_SECRET',
      false,
      '使用占位符或为空',
      `当前值: "${GITHUB_SECRET.substring(0, 10)}..."`,
      '请使用真实的 GitHub Client Secret'
    )
    return false
  }

  // GitHub Client Secret 格式检查
  if (!/^[a-zA-Z0-9]{40}$/i.test(GITHUB_SECRET)) {
    addResult(
      'GITHUB_SECRET 格式',
      false,
      '格式可能不正确',
      `当前值: "${GITHUB_SECRET.substring(0, 10)}..." (长度: ${GITHUB_SECRET.length})`,
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

  // 检查 NEXTAUTH_URL
  if (!NEXTAUTH_URL) {
    addResult(
      'NEXTAUTH_URL',
      false,
      '未设置',
      '将使用默认值: http://localhost:3000',
      '生产环境请设置正确的 NEXTAUTH_URL'
    )
  } else {
    if (NEXTAUTH_URL.endsWith('/')) {
      addResult(
        'NEXTAUTH_URL 格式',
        false,
        '有尾部斜杠',
        `当前值: "${NEXTAUTH_URL}"`,
        'NEXTAUTH_URL 不能有尾部斜杠'
      )
    } else if (!NEXTAUTH_URL.startsWith('http://') && !NEXTAUTH_URL.startsWith('https://')) {
      addResult(
        'NEXTAUTH_URL 格式',
        false,
        '格式不正确',
        `当前值: "${NEXTAUTH_URL}"`,
        'NEXTAUTH_URL 必须以 http:// 或 https:// 开头'
      )
    } else {
      addResult(
        'NEXTAUTH_URL',
        true,
        '已设置',
        `值: ${NEXTAUTH_URL}`
      )
    }
  }

  // 检查 NEXTAUTH_SECRET
  if (!NEXTAUTH_SECRET) {
    addResult(
      'NEXTAUTH_SECRET',
      false,
      '未设置',
      'NextAuth 需要此密钥来加密 session',
      '运行: openssl rand -base64 32 生成密钥'
    )
  } else if (NEXTAUTH_SECRET.length < 32) {
    addResult(
      'NEXTAUTH_SECRET',
      false,
      '长度不足',
      `当前长度: ${NEXTAUTH_SECRET.length} 字符`,
      '建议至少 32 字符'
    )
  } else {
    addResult(
      'NEXTAUTH_SECRET',
      true,
      '已设置',
      `长度: ${NEXTAUTH_SECRET.length} 字符`
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
    '计算的回调 URL',
    callbackUrl
  )

  // 检查 URL 格式
  if (NEXTAUTH_URL.includes('localhost') && !NEXTAUTH_URL.startsWith('http://')) {
    addResult(
      '回调 URL 协议',
      false,
      '本地环境应使用 http://',
      `当前: ${NEXTAUTH_URL}`,
      '本地开发使用: http://localhost:3000'
    )
  } else if (!NEXTAUTH_URL.includes('localhost') && !NEXTAUTH_URL.startsWith('https://')) {
    addResult(
      '回调 URL 协议',
      false,
      '生产环境应使用 https://',
      `当前: ${NEXTAUTH_URL}`,
      '生产环境使用: https://your-domain.com'
    )
  }

  console.log('\n📝 GitHub OAuth App 配置要求:')
  console.log('   1. 访问: https://github.com/settings/developers')
  console.log('   2. 选择你的 OAuth App')
  console.log('   3. 在 "Authorization callback URL" 中设置:')
  console.log(`      ${callbackUrl}`)
  console.log('   4. 确保 URL 完全匹配（无尾部斜杠，无查询参数）\n')

  return true
}

async function testNextAuthEndpoint(baseUrl: string, label: string) {
  console.log(`\n🌐 测试 ${label} NextAuth API 端点...\n`)

  try {
    const providersUrl = `${baseUrl}/api/auth/providers`
    console.log(`   正在测试: ${providersUrl}`)
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10秒超时

    const response = await fetch(providersUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GitHub-OAuth-Checker/1.0',
      },
    })

    clearTimeout(timeout)

    if (response.ok) {
      const providers = await response.json()
      
      if (providers.github) {
        addResult(
          `${label} - NextAuth Providers API`,
          true,
          'GitHub provider 已注册',
          'NextAuth 已正确识别 GitHub OAuth 配置'
        )
        return true
      } else {
        addResult(
          `${label} - NextAuth Providers API`,
          false,
          'GitHub provider 未注册',
          'NextAuth 无法识别 GitHub OAuth 配置',
          '检查环境变量和 NextAuth 配置'
        )
        return false
      }
    } else {
      addResult(
        `${label} - NextAuth Providers API`,
        false,
        `HTTP ${response.status}`,
        `无法访问 ${providersUrl}`,
        response.status === 404 
          ? '确保应用已部署到该 URL'
          : '检查服务器状态和网络连接'
      )
      return false
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      addResult(
        `${label} - NextAuth Providers API`,
        false,
        '连接超时',
        `无法在 10 秒内连接到 ${baseUrl}`,
        '检查 URL 是否正确，服务器是否运行'
      )
    } else {
      addResult(
        `${label} - NextAuth Providers API`,
        false,
        '连接失败',
        `错误: ${error.message}`,
        '检查 URL 是否正确，服务器是否运行'
      )
    }
    return false
  }
}

async function checkGitHubOAuthAppRequirements() {
  console.log('\n⚙️  检查 GitHub OAuth App 配置要求...\n')

  console.log('📋 请在 GitHub Developer Settings 中确认以下设置:\n')

  console.log('1. OAuth App 基本信息:')
  console.log('   - Application name: 可以是任何名称（例如: "X-like App"）')
  console.log('   - Homepage URL:')
  console.log(`     ${NEXTAUTH_URL}`)
  console.log('   - Application description: 可选\n')

  console.log('2. 回调 URL（最重要）:')
  console.log('   - Authorization callback URL:')
  console.log(`     ${NEXTAUTH_URL}/api/auth/callback/github`)
  console.log('   ⚠️  必须完全匹配，不能有:')
  console.log('      - 尾部斜杠 (/)')
  console.log('      - 查询参数 (?code=...)')
  console.log('      - 协议错误 (http vs https)\n')

  console.log('3. 权限范围:')
  console.log('   - NextAuth 请求: read:user, user:email')
  console.log('   - 这些是基本权限，通常不需要额外配置\n')

  console.log('4. 其他检查:')
  console.log('   - 确保 OAuth App 已启用')
  console.log('   - 检查是否有用户限制（仅限特定组织或用户）')
  console.log('   - 确认 Client ID 和 Secret 与 .env 中的值匹配\n')

  addResult(
    'GitHub Developer Settings',
    true,
    '请手动检查上述设置',
    '确保所有设置都已正确配置'
  )
}

async function checkVercelConfiguration() {
  if (!vercelUrl) {
    console.log('\n💡 提示: 可以通过命令行参数指定 Vercel URL 进行测试:')
    console.log('   npx tsx scripts/check-github-oauth-complete.ts https://xlikeapp.vercel.app\n')
    return
  }

  console.log('\n🚀 检查 Vercel 部署配置...\n')

  // 检查 Vercel URL 格式
  if (!vercelUrl.startsWith('https://')) {
    addResult(
      'Vercel URL 格式',
      false,
      '应使用 HTTPS',
      `当前: ${vercelUrl}`,
      'Vercel 部署必须使用 HTTPS'
    )
  } else {
    addResult(
      'Vercel URL',
      true,
      'URL 格式正确',
      `值: ${vercelUrl}`
    )
  }

  // 测试 Vercel 端点
  await testNextAuthEndpoint(vercelUrl, 'Vercel')

  console.log('\n💡 Vercel 环境变量检查:')
  console.log('   1. 访问 Vercel Dashboard > Settings > Environment Variables')
  console.log('   2. 确认以下变量已设置（Production 环境）:')
  console.log('      - NEXTAUTH_URL')
  console.log('      - GITHUB_ID 或 GITHUB_CLIENT_ID')
  console.log('      - GITHUB_SECRET 或 GITHUB_CLIENT_SECRET')
  console.log('      - NEXTAUTH_SECRET')
  console.log('   3. 确保变量值与本地 .env 文件一致')
  console.log('   4. 修改后必须重新部署\n')
}

async function main() {
  console.log('🚀 GitHub OAuth 完整配置检查\n')
  console.log('='.repeat(70))
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`)
  console.log(`NEXTAUTH_URL: ${NEXTAUTH_URL}`)
  if (vercelUrl) {
    console.log(`Vercel URL: ${vercelUrl}`)
  }
  console.log('='.repeat(70))

  const hasEnvVars = await checkEnvironmentVariables()
  await checkCallbackURL()
  
  if (hasEnvVars) {
    await checkGitHubOAuthAppRequirements()
  }

  // 测试本地端点（如果 NEXTAUTH_URL 是 localhost）
  if (NEXTAUTH_URL.includes('localhost')) {
    await testNextAuthEndpoint(NEXTAUTH_URL, '本地')
  }

  // 检查 Vercel 配置（如果提供了 URL）
  await checkVercelConfiguration()

  console.log('\n' + '='.repeat(70))
  console.log('\n📊 检查结果总结:\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed && !r.warning).length
  const warnings = results.filter(r => r.warning).length
  const total = results.length

  console.log(`总计: ${total} 项检查`)
  console.log(`通过: ${passed} 项`)
  if (warnings > 0) {
    console.log(`警告: ${warnings} 项`)
  }
  console.log(`失败: ${failed} 项`)

  if (failed === 0) {
    console.log('\n✅ 所有关键检查通过！GitHub OAuth 配置看起来正确。\n')
    console.log('💡 下一步:')
    console.log('   1. 确保 GitHub Developer Settings 中的回调 URL 已正确配置')
    console.log('   2. 如果使用 Vercel，确保环境变量已设置并重新部署')
    console.log('   3. 尝试实际登录测试')
    console.log('   4. 如果登录失败，检查浏览器控制台和服务器日志\n')
    process.exit(0)
  } else {
    console.log('\n❌ 部分检查失败，请根据上述错误信息进行修复。\n')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('\n❌ 检查脚本执行失败:', error)
  process.exit(1)
})


