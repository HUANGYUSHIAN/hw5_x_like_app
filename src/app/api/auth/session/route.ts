import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

/**
 * 從 test-auth-token 獲取測試登入 session
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
        console.log('[Session API] Using test-auth-token session')
      }
      return NextResponse.json(testSession)
    }

    // Otherwise, use NextAuth (OAuth login)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token || !token.sub) {
      return NextResponse.json(null)
    }

    // Validate token.sub is a valid MongoDB ObjectID (24 hex characters)
    // If it's a UUID or invalid format, return null
    const objectIdRegex = /^[0-9a-fA-F]{24}$/
    if (!objectIdRegex.test(token.sub)) {
      console.warn('Invalid token.sub format (not MongoDB ObjectID):', token.sub)
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
    const session = {
      user: {
        id: dbUser.id,
        userId: dbUser.userId,
        name: dbUser.name,
        email: dbUser.email || null,
        image: dbUser.avatarUrl || null,
      },
      expires: token.exp ? new Date(token.exp * 1000).toISOString() : undefined,
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(null)
  }
}



