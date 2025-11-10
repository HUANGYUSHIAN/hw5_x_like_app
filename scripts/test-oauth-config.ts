/**
 * OAuth 配置测试脚本
 * 测试 NextAuth.js OAuth 设置是否正确配置
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: string
}

const results: TestResult[] = []

function addResult(name: string, passed: boolean, message: string, details?: string) {
  results.push({ name, passed, message, details })
  const icon = passed ? '✓' : '✗'
  const color = passed ? '\x1b[32m' : '\x1b[31m'
  const reset = '\x1b[0m'
  console.log(`${color}${icon}${reset} ${name}: ${message}`)
  if (details) {
    console.log(`   ${details}`)
  }
}

async function testEnvironmentVariables() {
  console.log('\n📋 测试环境变量配置...\n')

  // Test NEXTAUTH_SECRET
  const nextAuthSecret = process.env.NEXTAUTH_SECRET
  if (!nextAuthSecret) {
    addResult(
      'NEXTAUTH_SECRET',
      false,
      '未设置',
      'NEXTAUTH_SECRET 是必需的，用于加密 JWT token'
    )
  } else if (nextAuthSecret === 'your_random_secret_here' || nextAuthSecret.length < 32) {
    addResult(
      'NEXTAUTH_SECRET',
      false,
      '配置无效',
      `当前值: "${nextAuthSecret.substring(0, 20)}..." (长度: ${nextAuthSecret.length})。建议使用至少 32 字符的随机字符串`
    )
  } else {
    addResult(
      'NEXTAUTH_SECRET',
      true,
      '已设置',
      `长度: ${nextAuthSecret.length} 字符`
    )
  }

  // Test NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL
  if (!nextAuthUrl) {
    addResult(
      'NEXTAUTH_URL',
      false,
      '未设置',
      'NEXTAUTH_URL 是必需的，用于 OAuth 回调'
    )
  } else if (!nextAuthUrl.startsWith('http://') && !nextAuthUrl.startsWith('https://')) {
    addResult(
      'NEXTAUTH_URL',
      false,
      '格式无效',
      `当前值: "${nextAuthUrl}"。必须以 http:// 或 https:// 开头`
    )
  } else {
    addResult(
      'NEXTAUTH_URL',
      true,
      '已设置',
      `值: ${nextAuthUrl}`
    )
  }

  // Test Google OAuth
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!googleClientId || googleClientId === 'your_client_id_here') {
    addResult(
      'GOOGLE_CLIENT_ID',
      false,
      '未设置或使用默认值',
      '请从 Google Cloud Console 获取真实的 Client ID'
    )
  } else {
    addResult(
      'GOOGLE_CLIENT_ID',
      true,
      '已设置',
      `值: ${googleClientId.substring(0, 20)}...`
    )
  }

  if (!googleClientSecret || googleClientSecret === 'your_client_secret_here') {
    addResult(
      'GOOGLE_CLIENT_SECRET',
      false,
      '未设置或使用默认值',
      '请从 Google Cloud Console 获取真实的 Client Secret'
    )
  } else {
    addResult(
      'GOOGLE_CLIENT_SECRET',
      true,
      '已设置',
      `值: ${googleClientSecret.substring(0, 10)}...`
    )
  }

  // Test GitHub OAuth (optional)
  const githubId = process.env.GITHUB_ID
  const githubSecret = process.env.GITHUB_SECRET

  if (githubId && githubId !== 'your_github_client_id_here') {
    addResult('GITHUB_ID', true, '已设置', 'GitHub OAuth 已配置')
  } else {
    addResult('GITHUB_ID', false, '未设置', 'GitHub OAuth 未配置（可选）')
  }

  if (githubSecret && githubSecret !== 'your_github_client_secret_here') {
    addResult('GITHUB_SECRET', true, '已设置', 'GitHub OAuth 已配置')
  } else {
    addResult('GITHUB_SECRET', false, '未设置', 'GitHub OAuth 未配置（可选）')
  }

  // Test Facebook OAuth (optional)
  const facebookClientId = process.env.FACEBOOK_CLIENT_ID
  const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET

  if (facebookClientId && facebookClientId !== 'your_facebook_client_id_here') {
    addResult('FACEBOOK_CLIENT_ID', true, '已设置', 'Facebook OAuth 已配置')
  } else {
    addResult('FACEBOOK_CLIENT_ID', false, '未设置', 'Facebook OAuth 未配置（可选）')
  }

  if (facebookClientSecret && facebookClientSecret !== 'your_facebook_client_secret_here') {
    addResult('FACEBOOK_CLIENT_SECRET', true, '已设置', 'Facebook OAuth 已配置')
  } else {
    addResult('FACEBOOK_CLIENT_SECRET', false, '未设置', 'Facebook OAuth 未配置（可选）')
  }
}

async function testNextAuthAPI() {
  console.log('\n🔌 测试 NextAuth API 端点...\n')

  try {
    // Test /api/auth/providers
    const providersUrl = `${BASE_URL}/api/auth/providers`
    const providersResponse = await fetch(providersUrl)
    
    if (providersResponse.ok) {
      const providers = await providersResponse.json()
      const providerNames = Object.keys(providers)
      
      if (providerNames.length > 0) {
        addResult(
          'NextAuth Providers API',
          true,
          '可访问',
          `已配置的 providers: ${providerNames.join(', ')}`
        )
      } else {
        addResult(
          'NextAuth Providers API',
          false,
          '无可用 providers',
          '请检查 OAuth provider 配置'
        )
      }
    } else {
      addResult(
        'NextAuth Providers API',
        false,
        `HTTP ${providersResponse.status}`,
        `无法访问 ${providersUrl}`
      )
    }
  } catch (error: any) {
    addResult(
      'NextAuth Providers API',
      false,
      '连接失败',
      `错误: ${error.message}。请确保开发服务器正在运行 (npm run dev)`
    )
  }

  try {
    // Test /api/auth/csrf
    const csrfUrl = `${BASE_URL}/api/auth/csrf`
    const csrfResponse = await fetch(csrfUrl)
    
    if (csrfResponse.ok) {
      const csrf = await csrfResponse.json()
      if (csrf.csrfToken) {
        addResult(
          'NextAuth CSRF API',
          true,
          '可访问',
          `CSRF Token: ${csrf.csrfToken.substring(0, 20)}...`
        )
      } else {
        addResult(
          'NextAuth CSRF API',
          false,
          '响应格式错误',
          '未返回 csrfToken'
        )
      }
    } else {
      addResult(
        'NextAuth CSRF API',
        false,
        `HTTP ${csrfResponse.status}`,
        `无法访问 ${csrfUrl}`
      )
    }
  } catch (error: any) {
    addResult(
      'NextAuth CSRF API',
      false,
      '连接失败',
      `错误: ${error.message}`
    )
  }
}

async function testOAuthProviderConfig() {
  console.log('\n🔐 测试 OAuth Provider 配置...\n')

  try {
    // Check providers based on environment variables
    const providers: Array<{ id: string; name: string; hasClientId: boolean; hasClientSecret: boolean }> = []

    // Google Provider
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (googleClientId && googleClientId !== 'your_client_id_here') {
      providers.push({
        id: 'google',
        name: 'Google',
        hasClientId: true,
        hasClientSecret: !!(googleClientSecret && googleClientSecret !== 'your_client_secret_here')
      })
    }

    // GitHub Provider
    const githubId = process.env.GITHUB_ID
    const githubSecret = process.env.GITHUB_SECRET
    if (githubId && githubId !== 'your_github_client_id_here') {
      providers.push({
        id: 'github',
        name: 'GitHub',
        hasClientId: true,
        hasClientSecret: !!(githubSecret && githubSecret !== 'your_github_client_secret_here')
      })
    }

    // Facebook Provider
    const facebookClientId = process.env.FACEBOOK_CLIENT_ID
    const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET
    if (facebookClientId && facebookClientId !== 'your_facebook_client_id_here') {
      providers.push({
        id: 'facebook',
        name: 'Facebook',
        hasClientId: true,
        hasClientSecret: !!(facebookClientSecret && facebookClientSecret !== 'your_facebook_client_secret_here')
      })
    }

    const providerCount = providers.length

    if (providerCount === 0) {
      addResult(
        'OAuth Providers',
        false,
        '未配置任何 provider',
        '请在 .env 文件中配置至少一个 OAuth provider 的 Client ID 和 Client Secret'
      )
    } else {
      addResult(
        'OAuth Providers',
        true,
        `已配置 ${providerCount} 个 providers`,
        providers.map(p => p.name).join(', ')
      )

      // Check each provider
      for (const provider of providers) {
        if (provider.hasClientId && provider.hasClientSecret) {
          addResult(
            `${provider.name} Provider`,
            true,
            '配置完整',
            'Client ID 和 Client Secret 已设置'
          )
        } else {
          addResult(
            `${provider.name} Provider`,
            false,
            '配置不完整',
            `缺少: ${!provider.hasClientId ? 'Client ID' : ''} ${!provider.hasClientSecret ? 'Client Secret' : ''}`
          )
        }
      }
    }

    // Check secret
    const secret = process.env.NEXTAUTH_SECRET
    if (secret && secret !== 'your_random_secret_here' && secret.length >= 32) {
      addResult(
        'NextAuth Secret',
        true,
        '已设置',
        'Secret 配置正确'
      )
    } else {
      addResult(
        'NextAuth Secret',
        false,
        '未设置或使用默认值',
        '请设置有效的 NEXTAUTH_SECRET（至少 32 字符）'
      )
    }
  } catch (error: any) {
    addResult(
      'NextAuth 配置',
      false,
      '检查失败',
      `错误: ${error.message}`
    )
  }
}

async function testOAuthCallbackURL() {
  console.log('\n🔗 测试 OAuth 回调 URL...\n')

  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const callbackUrl = `${nextAuthUrl}/api/auth/callback/google`

  addResult(
    'Google OAuth 回调 URL',
    true,
    '回调 URL',
    callbackUrl
  )

  console.log('\n📝 请在 Google Cloud Console 中配置以下回调 URL:')
  console.log(`   ${callbackUrl}\n`)

  // Check if URL is accessible (optional)
  try {
    const response = await fetch(callbackUrl, { method: 'GET' })
    if (response.status === 405 || response.status === 400) {
      // 405 Method Not Allowed or 400 Bad Request is expected for GET request
      addResult(
        '回调 URL 端点',
        true,
        '端点存在',
        '回调端点已正确配置'
      )
    } else {
      addResult(
        '回调 URL 端点',
        false,
        `HTTP ${response.status}`,
        '回调端点可能未正确配置'
      )
    }
  } catch (error: any) {
    addResult(
      '回调 URL 端点',
      false,
      '无法访问',
      `错误: ${error.message}。请确保开发服务器正在运行`
    )
  }
}

async function main() {
  console.log('🚀 开始测试 OAuth 配置...\n')
  console.log('=' .repeat(60))

  await testEnvironmentVariables()
  await testNextAuthAPI()
  await testOAuthProviderConfig()
  await testOAuthCallbackURL()

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 测试结果总结:\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`总计: ${total} 项测试`)
  console.log(`通过: ${passed} 项`)
  console.log(`失败: ${failed} 项`)

  if (failed === 0) {
    console.log('\n✅ 所有测试通过！OAuth 配置正确。\n')
    process.exit(0)
  } else {
    console.log('\n❌ 部分测试失败，请检查上述错误信息。\n')
    console.log('💡 提示:')
    console.log('   1. 确保所有必需的环境变量都已设置')
    console.log('   2. 确保开发服务器正在运行 (npm run dev)')
    console.log('   3. 检查 Google Cloud Console 中的 OAuth 配置')
    console.log('   4. 确保回调 URL 已正确配置\n')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})

