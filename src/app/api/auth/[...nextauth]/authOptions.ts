import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from '@/lib/prisma'

// 在模块级别构建 providers，确保 server 启动时从 .env 加载并保持稳定
// 优先使用 GitHub，其次 Google
let cachedProviders: any[] | null = null

function buildProviders() {
  // 如果已经构建过，直接返回缓存的 providers
  if (cachedProviders !== null) {
    return cachedProviders
  }
  const providers: any[] = []

  // 检查 GitHub 配置（支持多种环境变量名称）
  const githubId = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID
  const githubSecret = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET
  
  // 检查是否是有效的值（不是空字符串、不是占位符、不是 undefined）
  const hasGitHub = githubId && 
                    typeof githubId === 'string' &&
                    githubId.trim() !== '' && 
                    githubId !== 'your_github_client_id_here' &&
                    githubId !== 'your_client_id_here' &&
                    githubSecret && 
                    typeof githubSecret === 'string' &&
                    githubSecret.trim() !== '' && 
                    githubSecret !== 'your_github_client_secret_here' &&
                    githubSecret !== 'your_client_secret_here'

  // 检查 Google 配置
  const googleId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET
  
  // 检查是否是有效的值
  const hasGoogle = googleId && 
                     typeof googleId === 'string' &&
                     googleId.trim() !== '' && 
                     googleId !== 'your_client_id_here' &&
                     googleId !== 'your_google_client_id_here' &&
                     googleSecret && 
                     typeof googleSecret === 'string' &&
                     googleSecret.trim() !== '' && 
                     googleSecret !== 'your_client_secret_here' &&
                     googleSecret !== 'your_google_client_secret_here'

  // 调试日志（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 OAuth Providers 配置检查:')
    console.log(`  GitHub ID: ${githubId ? `已设置 (${githubId.substring(0, 10)}...)` : '未设置'}`)
    console.log(`  GitHub Secret: ${githubSecret ? `已设置 (${githubSecret.substring(0, 5)}...)` : '未设置'}`)
    console.log(`  GitHub: ${hasGitHub ? '✓ 已配置' : '✗ 未配置或配置无效'}`)
    console.log(`  Google ID: ${googleId ? `已设置 (${googleId.substring(0, 10)}...)` : '未设置'}`)
    console.log(`  Google Secret: ${googleSecret ? `已设置 (${googleSecret.substring(0, 5)}...)` : '未设置'}`)
    console.log(`  Google: ${hasGoogle ? '✓ 已配置' : '✗ 未配置或配置无效'}`)
    
    // 检查环境变量名称
    if (!hasGitHub) {
      console.log('  ⚠️  GitHub 配置问题:')
      if (!githubId) {
        console.log('    - 未找到 GITHUB_ID 或 GITHUB_CLIENT_ID')
      } else if (!githubSecret) {
        console.log('    - 未找到 GITHUB_SECRET 或 GITHUB_CLIENT_SECRET')
      } else {
        console.log('    - 值可能是占位符或空字符串')
      }
    }
    
    if (!hasGoogle) {
      console.log('  ⚠️  Google 配置问题:')
      if (!googleId) {
        console.log('    - 未找到 GOOGLE_CLIENT_ID 或 GOOGLE_ID')
      } else if (!googleSecret) {
        console.log('    - 未找到 GOOGLE_CLIENT_SECRET 或 GOOGLE_SECRET')
      } else {
        console.log('    - 值可能是占位符或空字符串')
      }
    }
  }

  // 获取 NEXTAUTH_URL（用于显示回调 URL）
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  // 验证 NEXTAUTH_URL 是否设置
  if (!process.env.NEXTAUTH_URL) {
    console.warn('⚠️  NEXTAUTH_URL 未设置，使用默认值: http://localhost:3000')
    console.warn('   请在 .env 文件中设置 NEXTAUTH_URL=http://localhost:3000')
  }

  // 优先添加 GitHub
  if (hasGitHub) {
    const githubCallbackUrl = `${nextAuthUrl}/api/auth/callback/github`
    
    providers.push(
      GitHubProvider({
        clientId: githubId!,
        clientSecret: githubSecret!,
      })
    )
    if (process.env.NODE_ENV === 'development') {
      console.log('  ✓ GitHub Provider 已添加')
      console.log(`  📋 GitHub 回调 URL: ${githubCallbackUrl}`)
      console.log(`  ⚠️  请确保 GitHub Developer Settings 中配置了此回调 URL`)
    }
  }

  // 其次添加 Google
  if (hasGoogle) {
    const googleCallbackUrl = `${nextAuthUrl}/api/auth/callback/google`
    
    providers.push(
      GoogleProvider({
        clientId: googleId!,
        clientSecret: googleSecret!,
      })
    )
    if (process.env.NODE_ENV === 'development') {
      console.log('  ✓ Google Provider 已添加')
      console.log(`  📋 Google 回调 URL: ${googleCallbackUrl}`)
      console.log(`  ⚠️  请确保 Google Cloud Console 中配置了此回调 URL`)
      console.log(`  ⚠️  在 Google Cloud Console 的 "已授权的重定向 URI" 中添加:`)
      console.log(`     ${googleCallbackUrl}`)
    }
  }

  // 如果都没有配置，抛出错误
  if (providers.length === 0) {
    const errorMsg = '❌ OAuth 配置错误：未配置任何可用的 OAuth provider。\n' +
      '请至少配置以下之一：\n' +
      '  - GitHub: GITHUB_ID 和 GITHUB_SECRET\n' +
      '  - Google: GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`  ✓ 总共配置了 ${providers.length} 个 OAuth providers`)
  }

  // 缓存 providers，确保后续调用返回相同的配置
  cachedProviders = providers
  return providers
}

// 在模块加载时立即构建 providers，确保 server 启动时从 .env 加载
const providers = buildProviders()

export const authOptions: NextAuthConfig = {
  providers: providers, // 使用在模块级别构建的 providers
  callbacks: {
    async session({ session, token }) {
      try {
        // If user needs registration (OAuth info but no user created), set flag
        if (token.needsRegistration) {
          session.needsRegistration = true
          session.provider = token.provider as string
          session.providerId = token.providerId as string
          return session
        }
        
        // User is registered, populate session with user data
        if (session.user && token.sub) {
          // Validate token.sub is MongoDB ObjectID format
          const objectIdRegex = /^[0-9a-fA-F]{24}$/
          if (objectIdRegex.test(token.sub)) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { id: token.sub },
              })
              
              if (dbUser) {
                session.user.id = dbUser.id
                session.user.userId = dbUser.userId
                session.user.email = dbUser.email || session.user.email
                session.needsRegistration = false
                // Check if userId is temporary (starts with "temp_")
                session.needsUserIdSetup = dbUser.userId.startsWith('temp_')
                // 记录登录标识
                session.loginIdentifier = token.loginIdentifier || dbUser.email || dbUser.userId
              } else {
                // User not found in database
                session.needsRegistration = true
                session.needsUserIdSetup = false
              }
            } catch (error) {
              console.error('Session callback error:', error)
              // If query fails, mark as needing registration
              session.needsRegistration = true
              session.needsUserIdSetup = false
            }
          } else {
            // Invalid ObjectID format
            console.warn('Invalid token.sub format in session callback:', token.sub)
            session.needsRegistration = true
            session.needsUserIdSetup = false
          }
        }
      } catch (error) {
        console.error('Session callback error:', error)
        // On any error, mark as needing registration to be safe
        session.needsRegistration = true
        session.needsUserIdSetup = false
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        // OAuth 登录：优先根据 email 查找用户（email 是 OAuth 的稳定标识）
        // 如果 email 不存在，则根据 provider + providerId 查找（兼容旧数据）
        let dbUser = null
        
        if (user.email) {
          // 优先根据 email 查找
          dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          })
        }
        
        // 如果根据 email 没找到，尝试根据 provider + providerId 查找（兼容旧数据）
        if (!dbUser) {
          dbUser = await prisma.user.findFirst({
            where: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          })
        }
        
        if (dbUser) {
          // Existing user - set token.sub to MongoDB ObjectID
          token.sub = dbUser.id
          token.userId = dbUser.userId
          token.email = dbUser.email || user.email || undefined
          // 记录登录标识：优先使用 email，如果没有则使用 userId
          token.loginIdentifier = dbUser.email || dbUser.userId
          token.needsUserIdSetup = false
          token.needsRegistration = false
        } else {
          // New user - email 不存在于数据库中，需要注册
          // 存储 OAuth 信息，等待用户输入 userId
          token.provider = account.provider
          token.providerId = account.providerAccountId
          token.email = user.email || undefined
          token.name = user.name || undefined
          token.image = user.image || undefined
          token.needsRegistration = true
          token.needsUserIdSetup = false
          // 不设置 token.sub，因为用户还未创建
          delete token.sub
        }
      } else if (token.sub) {
        // Subsequent requests - validate token.sub is MongoDB ObjectID format
        const objectIdRegex = /^[0-9a-fA-F]{24}$/
        if (objectIdRegex.test(token.sub)) {
          // Check if user exists and update token
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
            })
            
            if (dbUser) {
              token.userId = dbUser.userId
              token.email = dbUser.email || token.email
              // 记录登录标识：优先使用 email，如果没有则使用 userId
              token.loginIdentifier = dbUser.email || dbUser.userId
              // Check if userId is temporary (starts with "temp_")
              token.needsUserIdSetup = dbUser.userId.startsWith('temp_')
              token.needsRegistration = false
            } else {
              // User not found - clear token
              delete token.sub
              token.needsRegistration = true
            }
          } catch (error) {
            console.error('JWT callback error:', error)
            // If query fails, clear token.sub to force re-authentication
            delete token.sub
            token.needsRegistration = true
          }
        } else {
          // Invalid ObjectID format - clear token.sub
          console.warn('Invalid token.sub format in JWT callback:', token.sub)
          delete token.sub
          token.needsRegistration = true
        }
      }
      return token
    },
    async signIn({ user, account, profile }) {
      if (!account || !user.email) {
        return false
      }

      // Check if user exists by provider and providerId
      // Same person using different OAuth providers should be different users
      const existingUser = await prisma.user.findFirst({
        where: {
          provider: account.provider,
          providerId: account.providerAccountId,
        },
      })

      if (!existingUser) {
        // New user - redirect to registration page to collect userID
        // Store temporary user data in a way that can be retrieved after OAuth callback
        // We'll handle this in the registration flow
        return true // Allow sign in, but we'll check for userId in session callback
      }

      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // OAuth 错误时也跳转到登录页
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

