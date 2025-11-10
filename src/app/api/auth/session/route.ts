import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

/**
 * 從 test-auth-token cookie 獲取測試登入 session（後門機制）
 */
async function getTestAuthSession(request: NextRequest) {
  const token = request.cookies.get('test-auth-token')?.value
  if (!token) {
    return null
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'local-dev-secret-key-change-in-production'
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)

    if (!payload.sub) {
      return null
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    })

    if (!dbUser) {
      return null
    }

    return {
      user: {
        id: dbUser.id,
        userId: dbUser.userId,
        name: dbUser.name,
        email: dbUser.email || null,
        image: dbUser.avatarUrl || null,
      },
      expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // First, check for test-auth-token (backdoor for test login)
    // 测试登录优先于 OAuth 登录，避免冲突
    const testSession = await getTestAuthSession(request)
    if (testSession) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Session API] Using test-auth-token session:', {
          userId: testSession.user.userId,
          id: testSession.user.id,
        })
      }
      return NextResponse.json(testSession)
    }

    // Otherwise, use NextAuth (OAuth login)
    // 尝试调用 NextAuth 内置的 session endpoint
    // 如果失败，手动构建 session
    try {
      // 首先尝试通过 NextAuth 的 handlers 获取 session
      // 但这需要访问 NextAuth 实例，我们无法直接访问
      // 所以手动获取 token 并调用 session callback
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: process.env.NODE_ENV === 'production' 
          ? '__Secure-next-auth.session-token' 
          : 'next-auth.session-token',
      })

      if (!token || !token.sub) {
        return NextResponse.json(null)
      }

      // Validate token.sub is a valid MongoDB ObjectID format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/
      if (!objectIdRegex.test(token.sub)) {
        console.warn('[Session API] Invalid token.sub format (not MongoDB ObjectID):', token.sub)
        return NextResponse.json(null)
      }

      // Get user from database to get userId
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
      })

      if (!dbUser) {
        return NextResponse.json(null)
      }

      // Construct session object from token and database user
      // 确保包含所有必要的字段，包括 userId
      const session = {
        user: {
          id: dbUser.id,
          userId: dbUser.userId, // 确保包含 userId
          name: dbUser.name,
          email: dbUser.email || null,
          image: dbUser.avatarUrl || null,
        },
        expires: token.exp ? new Date(token.exp * 1000).toISOString() : undefined,
        needsUserIdSetup: token.needsUserIdSetup || false,
        provider: token.provider,
        providerId: token.providerId,
      }
      
      // 调试日志：确认 session API 返回的 userID
      if (process.env.NODE_ENV === 'development') {
        console.log('[Session API] 返回 session:', {
          userId: session.user.userId,
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        })
      }

      return NextResponse.json(session)
    } catch (error) {
      console.error('[Session API] Error getting NextAuth session:', error)
      return NextResponse.json(null)
    }
  } catch (error) {
    console.error('[Session API] Session error:', error)
    return NextResponse.json(null)
  }
}

