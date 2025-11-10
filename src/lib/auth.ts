import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
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

    // Get user from database
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
  } catch (error) {
    return null
  }
}

export async function getSession(request?: NextRequest) {
  if (!request) {
    return null
  }

  // First, check for test-auth-token (backdoor for test login)
  const testSession = await getTestAuthSession(request)
  if (testSession) {
    return testSession
  }

  // Otherwise, use NextAuth
  try {
    // 明确指定 cookie 名称，确保能正确读取 OAuth session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
    })

    if (!token || !token.sub) {
      return null
    }

    // Validate token.sub is a valid MongoDB ObjectID (24 hex characters)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/
    if (!objectIdRegex.test(token.sub)) {
      console.warn('[getSession] Invalid token.sub format:', token.sub)
      return null
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: token.sub },
    })

    if (!dbUser) {
      console.warn('[getSession] User not found in database:', token.sub)
      return null
    }

    // 确保 userID 存在
    if (!dbUser.userId || dbUser.userId.trim() === '') {
      console.error('[getSession] User missing userId:', token.sub)
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
      expires: token.exp ? new Date(token.exp * 1000).toISOString() : undefined,
    }
  } catch (error) {
    console.error('[getSession] Error:', error)
    return null
  }
}

export async function requireAuth(request: NextRequest) {
  const session = await getSession(request)
  
  if (!session || !session.user) {
    throw new Error('Unauthorized')
  }
  
  return session
}

export async function getCurrentUser(request: NextRequest) {
  const session = await getSession(request)
  return session?.user || null
}



