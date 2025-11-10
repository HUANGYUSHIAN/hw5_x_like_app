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
        authorization: {
          params: {
            scope: 'read:user user:email',
          },
        },
      })
    )
    if (process.env.NODE_ENV === 'development') {
      console.log('  ✓ GitHub Provider 已添加')
      console.log(`  📋 GitHub 回调 URL: ${githubCallbackUrl}`)
      console.log(`  ⚠️  请确保 GitHub Developer Settings 中配置了此回调 URL`)
      console.log(`  ⚠️  GitHub OAuth App 的 Authorization callback URL 必须完全匹配: ${githubCallbackUrl}`)
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
  // 确保在生产环境中正确处理 cookies
  useSecureCookies: process.env.NODE_ENV === 'production',
  // 调试选项（生产环境也启用，方便排查问题）
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  callbacks: {
    async session({ session, token }) {
      // ========== Session Callback 调试日志 ==========
      console.log('[Session Callback] ========== Session Callback 被调用 ==========')
      console.log('[Session Callback] Token:', {
        sub: token.sub,
        userId: token.userId,
        email: token.email,
        needsUserIdSetup: token.needsUserIdSetup,
      })
      console.log('[Session Callback] 初始 Session:', {
        user: session.user,
        needsUserIdSetup: session.needsUserIdSetup,
      })
      
      try {
        // 注意：needsRegistration 已不再使用，新用户会自动创建
        // 如果 token 有 needsUserIdSetup，说明用户有临时 ID，需要设置正式 ID
        
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
                  // 这种情况不应该发生，但如果发生了，标记为需要设置 userID
                  session.needsUserIdSetup = true
                  return session
                }
                
                session.user.id = dbUser.id
                session.user.userId = dbUser.userId // 确保 session 包含 userID
                if (dbUser.email) {
                  session.user.email = dbUser.email
                } else if (session.user.email) {
                  // Keep existing email if dbUser doesn't have one
                }
                session.needsUserIdSetup = token.needsUserIdSetup || false
                session.loginIdentifier = token.loginIdentifier || dbUser.email || dbUser.userId
                
                // 调试日志：确认 session 中的 userID
                console.log('[Session Callback] ✓ 用户数据已设置:', {
                  userId: session.user.userId,
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.name,
                })
                
                // 如果 userID 已更改，更新 session（用户可能在编辑页面更改了 ID）
                if (token.userId && token.userId !== dbUser.userId) {
                  console.log('[Session Callback] 检测到 userID 更改，更新 session:', {
                    oldUserId: token.userId,
                    newUserId: dbUser.userId,
                  })
                  session.user.userId = dbUser.userId
                  session.loginIdentifier = dbUser.email || dbUser.userId
                }
                
                // 最终确认：确保 session.user.userId 已设置
                console.log('[Session Callback] ✓ 最终 Session 对象:', {
                  'session.user.userId': session.user.userId,
                  'session.user.id': session.user.id,
                  'session.user.email': session.user.email,
                  'session.user.name': session.user.name,
                })
              } else {
                // User not found in database
                console.error('[Session Callback] ❌ 错误：找不到用户，ID:', token.sub)
                // 这种情况不应该发生，因为用户应该在 JWT callback 中已创建
                // 但为了安全，清除 session
                session.user = null as any
              }
            } catch (error) {
              console.error('[Session Callback] 数据库查询错误:', error)
              // If query fails, clear session
              session.user = null as any
            }
          } else {
            // Invalid ObjectID format
            console.warn('[Session Callback] ❌ 无效的 token.sub 格式:', token.sub)
            // 清除 session
            session.user = null as any
          }
        } else {
          console.warn('[Session Callback] ⚠️  session.user 或 token.sub 不存在:', {
            hasSessionUser: !!session.user,
            hasTokenSub: !!token.sub,
          })
        }
      } catch (error) {
        console.error('[Session Callback] ❌ 未捕获的错误:', error)
        // On any error, clear session
        session.user = null as any
      }
      
      console.log('[Session Callback] ========== 返回 Session ==========')
      console.log('[Session Callback] 最终 Session:', {
        'session.user.userId': session.user?.userId,
        'session.user.id': session.user?.id,
        'session.user.email': session.user?.email,
        'session.needsUserIdSetup': session.needsUserIdSetup,
      })
      
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
        
        // 验证 provider 值是否正确
        if (account.provider !== 'github' && account.provider !== 'google') {
          console.error('[OAuth] ❌ 错误：未知的 provider:', account.provider)
          throw new Error(`不支持的 OAuth provider: ${account.provider}`)
        }
        
        // 验证 GitHub 登录使用正确的 provider
        if (account.provider === 'github') {
          console.log('[OAuth] ✓ GitHub 登录，provider 正确: github')
        }
        
        // 验证 Google 登录使用正确的 provider
        if (account.provider === 'google') {
          console.log('[OAuth] ✓ Google 登录，provider 正确: google')
        }
        
        console.log('[OAuth] =====================================')
        
        // 验证：OAuth 登录必须有 email
        if (!user.email) {
          console.error('[OAuth] ❌ 错误：OAuth 回传数据中没有 email')
          throw new Error('OAuth 登录失败：未获取到 email 信息。请确保您的 OAuth 账号已授权 email 权限。')
        }
        
        // OAuth 登录：优先根据 provider + providerId 查找（最准确的匹配）
        // 如果没找到，再根据 email + provider 查找（email 相同但 provider 不同视为不同账号）
        // 这样可以区分同一个 email 用不同 provider 登录的情况
        let dbUser = null
        
        // 优先根据 provider + providerId 查找（最准确的匹配）
        // 确保使用正确的 provider 值（github 或 google）
        const correctProvider = account.provider === 'github' ? 'github' : account.provider === 'google' ? 'google' : account.provider
        console.log('[OAuth] 使用 provider 查找用户:', correctProvider)
        
        try {
          dbUser = await prisma.user.findFirst({
            where: {
              provider: correctProvider,
              providerId: account.providerAccountId,
            },
          })
          console.log('[OAuth] 根据 provider + providerId 查找用户:', correctProvider, account.providerAccountId, dbUser ? `✓ 找到 (ID: ${dbUser.userId}, Email: ${dbUser.email}, Provider: ${dbUser.provider})` : '✗ 未找到')
          
          // 验证找到的用户 provider 是否匹配
          if (dbUser && dbUser.provider !== correctProvider) {
            console.error('[OAuth] ❌ 错误：找到的用户 provider 不匹配:', {
              expected: correctProvider,
              found: dbUser.provider,
              userId: dbUser.userId,
            })
            // 不抛出错误，继续查找（可能是旧数据）
            dbUser = null
          }
        } catch (error) {
          console.error('[OAuth] 根据 provider + providerId 查找用户时出错:', error)
        }
        
        // 如果根据 provider + providerId 没找到，尝试根据 email + provider 查找
        // 这样可以找到同一个 provider 下相同 email 的用户（即使 providerId 可能不同，比如旧数据）
        if (!dbUser) {
          try {
            dbUser = await prisma.user.findFirst({
              where: {
                email: user.email,
                provider: correctProvider,
              },
            })
            console.log('[OAuth] 根据 email + provider 查找用户:', user.email, correctProvider, dbUser ? `✓ 找到 (ID: ${dbUser.userId}, Provider: ${dbUser.provider})` : '✗ 未找到')
            
            // 验证找到的用户 provider 是否匹配
            if (dbUser && dbUser.provider !== correctProvider) {
              console.error('[OAuth] ❌ 错误：找到的用户 provider 不匹配:', {
                expected: correctProvider,
                found: dbUser.provider,
                userId: dbUser.userId,
              })
              // 不抛出错误，继续查找（可能是旧数据）
              dbUser = null
            }
          } catch (error) {
            console.error('[OAuth] 根据 email + provider 查找用户时出错:', error)
          }
        }
        
        // 如果还是没找到，说明这是新用户（即使 email 相同，但 provider 不同）
        // 这种情况下会走下面的新用户创建流程
        
        if (dbUser) {
          // ========== 已存在用户：检查是否有 userID ==========
          if (!dbUser.userId || dbUser.userId.trim() === '') {
            // 用户存在但没有 userID，自动生成临时 userID
            console.log('[OAuth] ⚠️ 用户存在但没有 userID，自动生成临时 userID')
            console.log('[OAuth] Email:', dbUser.email)
            console.log('[OAuth] User ID (MongoDB):', dbUser.id)
            
            try {
              // 生成唯一的临时 userID（20 个字符，数字+英文字母）
              const { generateUniqueUserId } = await import('@/lib/generate-userid')
              const tempUserId = await generateUniqueUserId()
              console.log('[OAuth] 生成临时 userID:', tempUserId)
              
              // 更新用户记录，设置临时 userID
              // 确保使用正确的 provider（优先使用 account.provider，因为它是最新的）
              const updateProvider = correctProvider // 使用已验证的 correctProvider
              console.log('[OAuth] 更新用户，使用 provider:', updateProvider, '数据库中的 provider:', dbUser.provider)
              
              // 如果数据库中的 provider 与当前登录的 provider 不匹配，更新它
              if (dbUser.provider !== updateProvider) {
                console.log('[OAuth] ⚠️ 检测到 provider 不匹配，将更新:', {
                  old: dbUser.provider,
                  new: updateProvider,
                })
              }
              
              const updatedUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                  userId: tempUserId,
                  // 更新 OAuth 信息（如果数据库中的信息不完整）
                  name: dbUser.name || user.name || 'User',
                  email: dbUser.email || user.email,
                  avatarUrl: dbUser.avatarUrl || user.image || null,
                  provider: updateProvider, // 使用正确的 provider
                  providerId: dbUser.providerId || account.providerAccountId,
                },
              })
              
              // 验证更新后的 provider 是否正确
              if (updatedUser.provider !== updateProvider) {
                console.error('[OAuth] ❌ 错误：更新后的用户 provider 不正确:', {
                  expected: updateProvider,
                  found: updatedUser.provider,
                  userId: updatedUser.userId,
                })
              } else {
                console.log('[OAuth] ✓ 用户更新成功，provider 正确:', updatedUser.provider)
              }
              
              console.log('[OAuth] ✓ 用户已更新，设置临时 userID:', {
                id: updatedUser.id,
                userId: updatedUser.userId,
                email: updatedUser.email,
              })
              
              // 设置 token，标记用户需要设置正式 userID
              token.sub = updatedUser.id // MongoDB ObjectID
              token.userId = updatedUser.userId // 临时 userID
              token.email = updatedUser.email || undefined
              token.name = updatedUser.name
              token.image = updatedUser.avatarUrl || undefined
              token.provider = updateProvider // 使用正确的 provider
              token.providerId = updatedUser.providerId
              
              // 验证 token 中的 provider 是否正确
              if (token.provider !== updateProvider) {
                console.error('[OAuth] ❌ 错误：token.provider 设置不正确:', {
                  expected: updateProvider,
                  found: token.provider,
                })
              }
              token.needsUserIdSetup = true // 标记需要设置正式 userID
              token.loginIdentifier = updatedUser.email || updatedUser.userId
              
              console.log('[OAuth] Token 已设置，用户将被重定向到 /{userId}/edit 页面')
              console.log('[OAuth] 临时 userID:', tempUserId)
            } catch (error: any) {
              console.error('[OAuth] ❌ 更新用户失败:', error)
              // 如果更新失败，抛出错误，阻止登录
              throw new Error(`更新用户失败: ${error.message}`)
            }
          } else {
            // 用户存在且有 userID，正常登录
            // Existing user - set token.sub to MongoDB ObjectID
            token.sub = dbUser.id
            token.userId = dbUser.userId
            token.email = dbUser.email || user.email || undefined
            // 记录登录标识：优先使用 email，如果没有则使用 userId
            token.loginIdentifier = dbUser.email || dbUser.userId
            token.needsUserIdSetup = false
            
            // 确保 token 中的 provider 正确（使用已验证的 correctProvider）
            token.provider = correctProvider
            token.providerId = dbUser.providerId || account.providerAccountId
            
            // 验证 token 中的 provider 是否正确
            if (token.provider !== correctProvider) {
              console.error('[OAuth] ❌ 错误：token.provider 设置不正确:', {
                expected: correctProvider,
                found: token.provider,
              })
            } else {
              console.log('[OAuth] ✓ Token provider 正确:', token.provider)
            }
            
            // 如果数据库中的 provider 与当前登录的 provider 不匹配，记录警告（但不阻止登录）
            if (dbUser.provider !== correctProvider) {
              console.warn('[OAuth] ⚠️ 警告：数据库中的 provider 与登录 provider 不匹配:', {
                databaseProvider: dbUser.provider,
                loginProvider: correctProvider,
                userId: dbUser.userId,
                note: '建议更新数据库中的 provider 值',
              })
            }
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
          }
        } else {
          // ========== 新用户：自动生成临时 ID 并创建用户 ==========
          console.log('[OAuth] ✗ 新用户，自动创建账户')
          console.log('[OAuth] Provider:', account.provider)
          console.log('[OAuth] Email:', user.email)
          console.log('[OAuth] 数据库中未找到该 provider + email 组合对应的用户')
          console.log('[OAuth] 注意：即使 email 相同，不同 provider 也会被视为不同账号')
          
          try {
            // 生成唯一的临时 userID（20 个字符，数字+英文字母）
            const { generateUniqueUserId } = await import('@/lib/generate-userid')
            const tempUserId = await generateUniqueUserId()
            console.log('[OAuth] 生成临时 userID:', tempUserId)
            
            // 创建用户记录（包含 OAuth 信息和临时 userID）
            // 确保使用正确的 provider 值
            const providerToSave = account.provider === 'github' ? 'github' : account.provider === 'google' ? 'google' : account.provider
            console.log('[OAuth] 创建新用户，使用 provider:', providerToSave)
            
            let newUser
            try {
              newUser = await prisma.user.create({
                data: {
                  userId: tempUserId,
                  name: user.name || 'User',
                  email: user.email, // email 是必需的
                  avatarUrl: user.image || null,
                  provider: providerToSave,
                  providerId: account.providerAccountId,
                },
              })
            } catch (createError: any) {
              // 处理数据库唯一约束错误
              // 现在数据库应该使用 [email, provider] 复合唯一索引
              if (createError.code === 'P2002') {
                const constraintTarget = createError.meta?.target || []
                const isEmailProviderConstraint = Array.isArray(constraintTarget) && 
                  constraintTarget.includes('email') && constraintTarget.includes('provider')
                
                if (isEmailProviderConstraint) {
                  // 这是 [email, provider] 复合唯一约束冲突
                  // 说明相同 email + provider 的用户已存在，应该使用现有用户
                  console.warn('[OAuth] ⚠️ 检测到 [email, provider] 复合唯一约束冲突')
                  console.warn('[OAuth] 错误详情:', {
                    code: createError.code,
                    constraint: constraintTarget,
                    message: createError.message,
                  })
                  
                  // 查找现有用户（应该能找到，因为约束冲突说明已存在）
                  const existingUser = await prisma.user.findFirst({
                    where: {
                      email: user.email,
                      provider: providerToSave,
                    },
                  })
                  
                  if (existingUser) {
                    console.log('[OAuth] 找到现有用户（相同 email + provider），使用现有用户:', {
                      userId: existingUser.userId,
                      email: existingUser.email,
                      provider: existingUser.provider,
                    })
                    newUser = existingUser
                  } else {
                    // 找不到用户，但约束冲突，说明数据库状态不一致
                    console.error('[OAuth] ❌ 数据库状态不一致：约束冲突但找不到用户')
                    throw new Error(
                      `数据库状态不一致：检测到 [email, provider] 约束冲突，但找不到现有用户。` +
                      `请检查数据库状态或联系管理员。`
                    )
                  }
                } else if (constraintTarget.includes('email') && !constraintTarget.includes('provider')) {
                  // 这是旧的 email 唯一索引冲突（不应该发生，因为索引已修复）
                  console.error('[OAuth] ❌ 检测到旧的 email 唯一索引冲突（索引可能未正确修复）')
                  console.error('[OAuth] 错误详情:', {
                    code: createError.code,
                    constraint: constraintTarget,
                    message: createError.message,
                  })
                  
                  // 尝试查找现有用户
                  const existingUserWithEmail = await prisma.user.findFirst({
                    where: {
                      email: user.email,
                    },
                  })
                  
                  if (existingUserWithEmail) {
                    if (existingUserWithEmail.provider !== providerToSave) {
                      throw new Error(
                        `数据库索引配置错误：存在旧的 email 唯一索引。` +
                        `请运行 "npm run fix-mongodb-indexes" 删除旧的索引。` +
                        `详细信息：现有用户 provider=${existingUserWithEmail.provider}，尝试创建 provider=${providerToSave}`
                      )
                    } else {
                      console.log('[OAuth] Provider 相同，使用现有用户')
                      newUser = existingUserWithEmail
                    }
                  } else {
                    throw new Error(
                      `数据库索引配置错误：email 唯一约束冲突。` +
                      `请运行 "npm run fix-mongodb-indexes" 更新索引。`
                    )
                  }
                } else {
                  // 其他唯一约束错误（如 userId）
                  console.error('[OAuth] ❌ 其他唯一约束冲突:', {
                    code: createError.code,
                    constraint: constraintTarget,
                    message: createError.message,
                  })
                  throw createError
                }
              } else {
                // 其他错误，直接抛出
                throw createError
              }
            }
            
            // 验证创建的用户的 provider 是否正确
            if (newUser.provider !== providerToSave) {
              console.error('[OAuth] ❌ 错误：创建的用户 provider 不正确:', {
                expected: providerToSave,
                found: newUser.provider,
                userId: newUser.userId,
              })
            } else {
              console.log('[OAuth] ✓ 用户创建成功，provider 正确:', newUser.provider)
            }
            
            console.log('[OAuth] ✓ 用户已创建:', {
              id: newUser.id,
              userId: newUser.userId,
              email: newUser.email,
            })
            
            // 设置 token，标记用户需要设置正式 userID
            token.sub = newUser.id // MongoDB ObjectID
            token.userId = newUser.userId // 临时 userID
            token.email = newUser.email || undefined
            token.name = newUser.name
            token.image = newUser.avatarUrl || undefined
            token.provider = providerToSave
            token.providerId = account.providerAccountId
            
            // 验证 token 中的 provider 是否正确
            if (token.provider !== providerToSave) {
              console.error('[OAuth] ❌ 错误：token.provider 设置不正确:', {
                expected: providerToSave,
                found: token.provider,
              })
            }
            token.needsUserIdSetup = true // 标记需要设置正式 userID
            token.loginIdentifier = newUser.email || newUser.userId
            
            console.log('[OAuth] Token 已设置，用户将被重定向到 /{userId}/edit 页面')
            console.log('[OAuth] 临时 userID:', tempUserId)
          } catch (error: any) {
            console.error('[OAuth] ❌ 创建用户失败:', error)
            // 如果创建失败，抛出错误，阻止登录
            throw new Error(`创建用户失败: ${error.message}`)
          }
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
                token.needsUserIdSetup = true
                return token
              }
              
              // 如果 userID 已更改，更新 token（用户可能在编辑页面更改了 ID）
              // 注意：这个检查应该在设置 token.userId 之前进行
              if (token.userId && token.userId !== dbUser.userId) {
                console.log('[JWT] 检测到 userID 更改，更新 token:', {
                  oldUserId: token.userId,
                  newUserId: dbUser.userId,
                })
              }
              
              token.userId = dbUser.userId
              token.email = dbUser.email || token.email || undefined
              // 记录登录标识：优先使用 email，如果没有则使用 userId
              token.loginIdentifier = dbUser.email || dbUser.userId
              token.needsUserIdSetup = false
            } else {
              // User not found - clear token
              console.error('[JWT] ❌ 错误：找不到用户，ID:', token.sub)
              delete token.sub
              token.needsUserIdSetup = true
            }
          } catch (error) {
            console.error('[JWT] JWT callback error:', error)
            // If query fails, clear token.sub to force re-authentication
            delete token.sub
            token.needsUserIdSetup = true
          }
        } else {
          // Invalid ObjectID format - clear token.sub
          console.warn('[JWT] Invalid token.sub format in JWT callback:', token.sub)
          delete token.sub
          token.needsUserIdSetup = true
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
      
      // 验证 provider 值
      const signInProvider = account.provider === 'github' ? 'github' : account.provider === 'google' ? 'google' : account.provider
      console.log('[SignIn] 使用 provider 查找用户:', signInProvider)
      
      if (signInProvider !== 'github' && signInProvider !== 'google') {
        console.error('[SignIn] ❌ 错误：未知的 provider:', account.provider)
        return false
      }
      
      // 根据 provider + providerId 查找用户（最准确的匹配）
      let existingUser = null
      try {
        existingUser = await prisma.user.findFirst({
          where: {
            provider: signInProvider,
            providerId: account.providerAccountId,
          },
        })
        if (existingUser) {
          console.log('[SignIn] ✓ 找到已存在用户 (provider + providerId):', existingUser.userId, 'Provider:', existingUser.provider)
          
          // 验证找到的用户的 provider 是否匹配
          if (existingUser.provider !== signInProvider) {
            console.error('[SignIn] ❌ 错误：找到的用户 provider 不匹配:', {
              expected: signInProvider,
              found: existingUser.provider,
              userId: existingUser.userId,
            })
            existingUser = null // 重置，继续查找
          }
        } else {
          console.log('[SignIn] ✗ 未找到用户 (provider + providerId)')
        }
      } catch (error) {
        console.error('[SignIn] 查找用户时出错:', error)
      }
      
      // 如果根据 provider + providerId 没找到，尝试根据 email + provider 查找
      if (!existingUser) {
        try {
          existingUser = await prisma.user.findFirst({
            where: {
              email: user.email,
              provider: signInProvider,
            },
          })
          if (existingUser) {
            console.log('[SignIn] ✓ 找到已存在用户 (email + provider):', existingUser.userId, 'Provider:', existingUser.provider)
            
            // 验证找到的用户的 provider 是否匹配
            if (existingUser.provider !== signInProvider) {
              console.error('[SignIn] ❌ 错误：找到的用户 provider 不匹配:', {
                expected: signInProvider,
                found: existingUser.provider,
                userId: existingUser.userId,
              })
              existingUser = null // 重置
            }
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
      
      // 注意：redirect callback 在 JWT callback 之后执行
      // 新用户现在会在 JWT callback 中自动创建，并设置 needsUserIdSetup = true
      // Middleware 会检查 needsUserIdSetup 并重定向到 /{userId}/edit
      
      // 如果 URL 是相对路径，使用 baseUrl
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`
        console.log('[Redirect] Redirecting to:', redirectUrl)
        console.log('[Redirect] Note: Middleware will check needsUserIdSetup and redirect to /{userId}/edit if needed')
        return redirectUrl
      }
      // 如果 URL 是同一个域名，允许重定向
      if (new URL(url).origin === baseUrl) {
        console.log('[Redirect] Redirecting to same origin:', url)
        console.log('[Redirect] Note: Middleware will check needsUserIdSetup and redirect to /{userId}/edit if needed')
        return url
      }
      // 否则重定向到首页
      console.log('[Redirect] Redirecting to baseUrl:', baseUrl)
      console.log('[Redirect] Note: Middleware will check needsUserIdSetup and redirect to /{userId}/edit if needed')
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // 错误时重定向到登录页 // OAuth 错误时也跳转到登录页
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

