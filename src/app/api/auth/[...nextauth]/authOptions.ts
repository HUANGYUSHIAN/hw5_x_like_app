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

  // 调试日志（开发和生产环境都输出，但生产环境不输出敏感信息）
  console.log('🔐 OAuth Providers 配置检查:')
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`)
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

  // 获取 NEXTAUTH_URL（用于显示回调 URL）
  // 确保 URL 没有尾部斜杠（NextAuth 要求）
  let nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  if (nextAuthUrl.endsWith('/')) {
    nextAuthUrl = nextAuthUrl.slice(0, -1)
    console.warn('⚠️  NEXTAUTH_URL 有尾部斜杠，已自动移除')
  }
  
  // 验证 NEXTAUTH_URL 是否设置
  if (!process.env.NEXTAUTH_URL) {
    console.warn('⚠️  NEXTAUTH_URL 未设置，使用默认值: http://localhost:3000')
    console.warn('   请在 .env 文件中设置 NEXTAUTH_URL=http://localhost:3000')
  } else {
    console.log(`  ✓ NEXTAUTH_URL: ${nextAuthUrl}`)
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
      '  - Google: GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET\n' +
      `\n当前环境变量检查:\n` +
      `  - GITHUB_ID: ${process.env.GITHUB_ID ? '存在' : '不存在'}\n` +
      `  - GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? '存在' : '不存在'}\n` +
      `  - GITHUB_SECRET: ${process.env.GITHUB_SECRET ? '存在' : '不存在'}\n` +
      `  - GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? '存在' : '不存在'}\n` +
      `  - GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '存在' : '不存在'}\n` +
      `  - GOOGLE_ID: ${process.env.GOOGLE_ID ? '存在' : '不存在'}\n` +
      `  - GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '存在' : '不存在'}\n` +
      `  - GOOGLE_SECRET: ${process.env.GOOGLE_SECRET ? '存在' : '不存在'}\n` +
      `  - NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '未设置'}`
    console.error(errorMsg)
    // 在生产环境中，不抛出错误，而是返回空数组，让 NextAuth 可以初始化
    // 这样至少可以让应用运行，虽然 OAuth 不可用
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  生产环境：OAuth providers 未配置，但继续初始化 NextAuth（OAuth 功能将不可用）')
      cachedProviders = providers // 已经是空数组
    } else {
      throw new Error(errorMsg)
    }
  }

  console.log(`  ✓ 总共配置了 ${providers.length} 个 OAuth providers`)

  // 缓存 providers，确保后续调用返回相同的配置
  cachedProviders = providers
  return providers
}

// 在模块加载时立即构建 providers，确保 server 启动时从 .env 加载
const providers = buildProviders()

export const authOptions: NextAuthConfig = {
  providers: providers, // 使用在模块级别构建的 providers
  // 显式设置 trustHost 以确保在生产环境中正确处理 cookies
  trustHost: true,
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
                // 确保 session 始终包含 userID
                if (!dbUser.userId || dbUser.userId.trim() === '') {
                  console.error('[Session] ❌ 错误：数据库中的用户没有 userID，ID:', token.sub)
                  session.needsRegistration = true
                  session.needsUserIdSetup = false
                  return session
                }
                
                session.user.id = dbUser.id
                session.user.userId = dbUser.userId // 确保 session 包含 userID
                if (dbUser.email) {
                  session.user.email = dbUser.email
                } else if (session.user.email) {
                  // Keep existing email if dbUser doesn't have one
                }
                session.needsRegistration = false
                session.needsUserIdSetup = false
                session.loginIdentifier = token.loginIdentifier || dbUser.email || dbUser.userId
                
                // 如果 userID 已更改，更新 session（用户可能在编辑页面更改了 ID）
                if (token.userId && token.userId !== dbUser.userId) {
                  console.log('[Session] 检测到 userID 更改，更新 session:', {
                    oldUserId: token.userId,
                    newUserId: dbUser.userId,
                  })
                  session.user.userId = dbUser.userId
                  session.loginIdentifier = dbUser.email || dbUser.userId
                }
              } else {
                // User not found in database
                console.error('[Session] ❌ 错误：找不到用户，ID:', token.sub)
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
        // ========== OAuth 回传数据日志（用于调试） ==========
        console.log('[OAuth] ========== OAuth 回传数据 ==========')
        console.log('[OAuth] Provider:', account.provider)
        console.log('[OAuth] Provider Account ID:', account.providerAccountId)
        console.log('[OAuth] User Email:', user.email || '未提供')
        console.log('[OAuth] User Name:', user.name || '未提供')
        console.log('[OAuth] User Image:', user.image || '未提供')
        console.log('[OAuth] Account Type:', account.type)
        console.log('[OAuth] Account Provider:', account.provider)
        console.log('[OAuth] =====================================')
        
        // 验证：OAuth 登录必须有 email
        if (!user.email) {
          console.error('[OAuth] ❌ 错误：OAuth 回传数据中没有 email')
          throw new Error('OAuth 登录失败：未获取到 email 信息。请确保您的 OAuth 账号已授权 email 权限。')
        }
        
        // OAuth 登录：优先根据 email 查找用户（email 是 OAuth 的稳定标识）
        // 如果 email 不存在，则根据 provider + providerId 查找（兼容旧数据）
        let dbUser = null
        
        // 优先根据 email 查找
        try {
          dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          })
          console.log('[OAuth] 根据 email 查找用户:', user.email, dbUser ? `✓ 找到 (ID: ${dbUser.userId})` : '✗ 未找到')
        } catch (error) {
          console.error('[OAuth] 根据 email 查找用户时出错:', error)
        }
        
        // 如果根据 email 没找到，尝试根据 provider + providerId 查找（兼容旧数据）
        if (!dbUser) {
          try {
            dbUser = await prisma.user.findFirst({
              where: {
                provider: account.provider,
                providerId: account.providerAccountId,
              },
            })
            console.log('[OAuth] 根据 provider 查找用户:', account.provider, account.providerAccountId, dbUser ? `✓ 找到 (ID: ${dbUser.userId})` : '✗ 未找到')
          } catch (error) {
            console.error('[OAuth] 根据 provider 查找用户时出错:', error)
          }
        }
        
        if (dbUser) {
          // ========== 已存在用户：验证 session 是否有 userID ==========
          if (!dbUser.userId || dbUser.userId.trim() === '') {
            console.error('[OAuth] ❌ 错误：数据库中的用户没有 userID')
            throw new Error('用户数据错误：缺少 userID。请联系管理员。')
          }
          
          // Existing user - set token.sub to MongoDB ObjectID
          token.sub = dbUser.id
          token.userId = dbUser.userId
          token.email = dbUser.email || user.email || undefined
          // 记录登录标识：优先使用 email，如果没有则使用 userId
          token.loginIdentifier = dbUser.email || dbUser.userId
          token.needsUserIdSetup = false
          token.needsRegistration = false
          console.log('[OAuth] ✓ 登录成功 - 已存在用户:', {
            userId: dbUser.userId,
            email: dbUser.email,
            tokenSub: token.sub,
          })
          console.log('[OAuth] Token 已设置，NextAuth 将写入 cookie:', {
            cookieName: process.env.NODE_ENV === 'production' 
              ? '__Secure-next-auth.session-token' 
              : 'next-auth.session-token',
            hasTokenSub: !!token.sub,
            hasTokenUserId: !!token.userId,
            note: '如果 cookie 未设置，请检查：1) HTTPS 是否启用 2) NEXTAUTH_SECRET 是否正确 3) trustHost 是否为 true',
          })
        } else {
          // ========== 新用户：需要注册 ==========
          console.log('[OAuth] ✗ 新用户，需要注册')
          console.log('[OAuth] Email:', user.email)
          console.log('[OAuth] 数据库中未找到该 email 对应的用户')
          
          // 存储 OAuth 信息，等待用户输入 userId 完成注册
          // 不允许自动创建用户，必须通过 /register 页面完成注册
          token.provider = account.provider
          token.providerId = account.providerAccountId
          token.email = user.email // email 是必需的，用于后续注册
          token.name = user.name || undefined
          token.image = user.image || undefined
          token.needsRegistration = true
          token.needsUserIdSetup = false
          // 不设置 token.sub，因为用户还未创建
          delete token.sub
          console.log('[OAuth] 等待用户注册，OAuth 信息已保存到 token')
          console.log('[OAuth] 用户将被重定向到 /auth/register 页面')
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
              // 确保 session 始终包含 userID
              if (!dbUser.userId || dbUser.userId.trim() === '') {
                console.error('[JWT] ❌ 错误：数据库中的用户没有 userID，ID:', token.sub)
                delete token.sub
                token.needsRegistration = true
                return token
              }
              
              token.userId = dbUser.userId
              token.email = dbUser.email || token.email || undefined
              // 记录登录标识：优先使用 email，如果没有则使用 userId
              token.loginIdentifier = dbUser.email || dbUser.userId
              token.needsUserIdSetup = false
              token.needsRegistration = false
              
              // 如果 userID 已更改，更新 token（用户可能在编辑页面更改了 ID）
              if (token.userId !== dbUser.userId) {
                console.log('[JWT] 检测到 userID 更改，更新 token:', {
                  oldUserId: token.userId,
                  newUserId: dbUser.userId,
                })
                token.userId = dbUser.userId
                token.loginIdentifier = dbUser.email || dbUser.userId
              }
            } else {
              // User not found - clear token
              console.error('[JWT] ❌ 错误：找不到用户，ID:', token.sub)
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
      // ========== SignIn Callback 日志 ==========
      console.log('[SignIn] ========== SignIn Callback ==========')
      console.log('[SignIn] Provider:', account?.provider || '未提供')
      console.log('[SignIn] User Email:', user?.email || '未提供')
      console.log('[SignIn] User Name:', user?.name || '未提供')
      
      // 验证必需的数据
      if (!account) {
        console.error('[SignIn] ❌ 错误：account 未提供')
        return false
      }
      
      if (!user.email) {
        console.error('[SignIn] ❌ 错误：OAuth 回传数据中没有 email')
        console.error('[SignIn] 这通常是因为 OAuth 账号未授权 email 权限')
        console.error('[SignIn] 请确保在 OAuth 提供商设置中授权了 email 权限')
        return false // 拒绝登录，因为没有 email 无法查找或创建用户
      }
      
      console.log('[SignIn] ✓ Email 验证通过:', user.email)
      
      // 根据 email 查找用户（优先）
      let existingUser = null
      try {
        existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (existingUser) {
          console.log('[SignIn] ✓ 找到已存在用户 (email):', existingUser.userId)
        } else {
          console.log('[SignIn] ✗ 未找到用户 (email):', user.email, '- 需要注册')
        }
      } catch (error) {
        console.error('[SignIn] 查找用户时出错:', error)
      }
      
      // 如果根据 email 没找到，尝试根据 provider + providerId 查找（兼容旧数据）
      if (!existingUser) {
        try {
          existingUser = await prisma.user.findFirst({
            where: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          })
          if (existingUser) {
            console.log('[SignIn] ✓ 找到已存在用户 (provider):', existingUser.userId)
          }
        } catch (error) {
          console.error('[SignIn] 根据 provider 查找用户时出错:', error)
        }
      }
      
      if (existingUser) {
        // 验证用户是否有 userID
        if (!existingUser.userId || existingUser.userId.trim() === '') {
          console.error('[SignIn] ❌ 错误：数据库中的用户没有 userID')
          return false // 拒绝登录，因为用户数据不完整
        }
        console.log('[SignIn] ✓ 登录成功 - 已存在用户:', existingUser.userId)
        return true
      } else {
        // 新用户 - 允许登录，但会在 JWT callback 中标记为需要注册
        console.log('[SignIn] ✓ 新用户，允许登录，将在 JWT callback 中标记为需要注册')
        return true
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('[Redirect] Redirect callback called:', { url, baseUrl })
      
      // 如果 URL 是相对路径，使用 baseUrl
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`
        console.log('[Redirect] Redirecting to:', redirectUrl)
        return redirectUrl
      }
      // 如果 URL 是同一个域名，允许重定向
      if (new URL(url).origin === baseUrl) {
        console.log('[Redirect] Redirecting to same origin:', url)
        return url
      }
      // 否则重定向到首页
      console.log('[Redirect] Redirecting to baseUrl:', baseUrl)
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // OAuth 错误时也跳转到登录页
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    // 确保 session 更新策略
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  // 显式配置 cookies（NextAuth v5 在生产环境必需）
  // 重要：生产环境必须使用 HTTPS，否则 __Secure-* cookie 无法设置
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // 生产环境必须 true（需要 HTTPS）
        // 不设置 domain，让浏览器自动处理（Vercel 需要）
        // 不设置 maxAge，使用 session.maxAge
      },
    },
  },
}

// 在模块加载时输出 cookies 配置（用于调试）
if (process.env.NODE_ENV === 'production') {
  console.log('[NextAuth] Cookies 配置:', {
    sessionTokenName: '__Secure-next-auth.session-token',
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    trustHost: true,
    note: '生产环境必须使用 HTTPS，否则 __Secure-* cookie 无法设置',
  })
}

