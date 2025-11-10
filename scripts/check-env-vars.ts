/**
 * 检查环境变量配置脚本
 * 检查 OAuth 相关的环境变量是否正确设置
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local') })

console.log('🔍 检查环境变量配置...\n')
console.log('='.repeat(60))

// 检查所有可能的环境变量名称
const envVars = {
  // GitHub
  'GITHUB_ID': process.env.GITHUB_ID,
  'GITHUB_CLIENT_ID': process.env.GITHUB_CLIENT_ID,
  'GITHUB_SECRET': process.env.GITHUB_SECRET,
  'GITHUB_CLIENT_SECRET': process.env.GITHUB_CLIENT_SECRET,
  
  // Google
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_ID': process.env.GOOGLE_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_SECRET': process.env.GOOGLE_SECRET,
  
  // NextAuth
  'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
  'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
}

console.log('\n📋 环境变量检查结果:\n')

// GitHub 检查
console.log('GitHub OAuth:')
const githubId = envVars.GITHUB_ID || envVars.GITHUB_CLIENT_ID
const githubSecret = envVars.GITHUB_SECRET || envVars.GITHUB_CLIENT_SECRET

if (githubId) {
  console.log(`  ✓ GITHUB_ID 或 GITHUB_CLIENT_ID: ${githubId.substring(0, 20)}...`)
} else {
  console.log('  ✗ GITHUB_ID 或 GITHUB_CLIENT_ID: 未设置')
}

if (githubSecret) {
  console.log(`  ✓ GITHUB_SECRET 或 GITHUB_CLIENT_SECRET: ${githubSecret.substring(0, 10)}...`)
} else {
  console.log('  ✗ GITHUB_SECRET 或 GITHUB_CLIENT_SECRET: 未设置')
}

if (envVars.GITHUB_ID && envVars.GITHUB_CLIENT_ID) {
  console.log('  ⚠️  警告: 同时设置了 GITHUB_ID 和 GITHUB_CLIENT_ID，代码使用 GITHUB_ID')
}
if (envVars.GITHUB_SECRET && envVars.GITHUB_CLIENT_SECRET) {
  console.log('  ⚠️  警告: 同时设置了 GITHUB_SECRET 和 GITHUB_CLIENT_SECRET，代码使用 GITHUB_SECRET')
}

// Google 检查
console.log('\nGoogle OAuth:')
const googleId = envVars.GOOGLE_CLIENT_ID || envVars.GOOGLE_ID
const googleSecret = envVars.GOOGLE_CLIENT_SECRET || envVars.GOOGLE_SECRET

if (googleId) {
  console.log(`  ✓ GOOGLE_CLIENT_ID 或 GOOGLE_ID: ${googleId.substring(0, 20)}...`)
} else {
  console.log('  ✗ GOOGLE_CLIENT_ID 或 GOOGLE_ID: 未设置')
}

if (googleSecret) {
  console.log(`  ✓ GOOGLE_CLIENT_SECRET 或 GOOGLE_SECRET: ${googleSecret.substring(0, 10)}...`)
} else {
  console.log('  ✗ GOOGLE_CLIENT_SECRET 或 GOOGLE_SECRET: 未设置')
}

if (envVars.GOOGLE_CLIENT_ID && envVars.GOOGLE_ID) {
  console.log('  ⚠️  警告: 同时设置了 GOOGLE_CLIENT_ID 和 GOOGLE_ID，代码使用 GOOGLE_CLIENT_ID')
}
if (envVars.GOOGLE_CLIENT_SECRET && envVars.GOOGLE_SECRET) {
  console.log('  ⚠️  警告: 同时设置了 GOOGLE_CLIENT_SECRET 和 GOOGLE_SECRET，代码使用 GOOGLE_CLIENT_SECRET')
}

// NextAuth 检查
console.log('\nNextAuth 配置:')
if (envVars.NEXTAUTH_URL) {
  console.log(`  ✓ NEXTAUTH_URL: ${envVars.NEXTAUTH_URL}`)
} else {
  console.log('  ✗ NEXTAUTH_URL: 未设置')
}

if (envVars.NEXTAUTH_SECRET) {
  const secretLength = envVars.NEXTAUTH_SECRET.length
  console.log(`  ✓ NEXTAUTH_SECRET: 已设置 (长度: ${secretLength})`)
  if (secretLength < 32) {
    console.log('  ⚠️  警告: NEXTAUTH_SECRET 长度建议至少 32 字符')
  }
} else {
  console.log('  ✗ NEXTAUTH_SECRET: 未设置')
}

// 检查代码中使用的变量名
console.log('\n📝 代码中使用的环境变量名称:')
console.log('  - GitHub: GITHUB_ID, GITHUB_SECRET')
console.log('  - Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET')
console.log('  - NextAuth: NEXTAUTH_URL, NEXTAUTH_SECRET')

// 检查不匹配
console.log('\n⚠️  潜在问题:')
if (!githubId && !githubSecret) {
  console.log('  - GitHub OAuth 未配置')
} else if (!githubId || !githubSecret) {
  console.log('  - GitHub OAuth 配置不完整')
}

if (!googleId && !googleSecret) {
  console.log('  - Google OAuth 未配置')
} else if (!googleId || !googleSecret) {
  console.log('  - Google OAuth 配置不完整')
}

if (!envVars.NEXTAUTH_URL || !envVars.NEXTAUTH_SECRET) {
  console.log('  - NextAuth 配置不完整')
}

console.log('\n' + '='.repeat(60))
console.log('\n💡 建议:')
console.log('  1. 确保 .env 文件中使用正确的变量名:')
console.log('     - GITHUB_ID (不是 GITHUB_CLIENT_ID)')
console.log('     - GITHUB_SECRET (不是 GITHUB_CLIENT_SECRET)')
console.log('     - GOOGLE_CLIENT_ID')
console.log('     - GOOGLE_CLIENT_SECRET')
console.log('     - NEXTAUTH_URL')
console.log('     - NEXTAUTH_SECRET')
console.log('  2. 确保值不是占位符（如 your_client_id_here）')
console.log('  3. 重启开发服务器以使环境变量生效\n')



