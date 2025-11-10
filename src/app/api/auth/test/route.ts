import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT } from 'jose'

/**
 * 測試登入 API - 類似 LOCAL_AUTH 的後門機制
 * 不依賴 NextAuth，使用獨立的 test-auth-token cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name } = body

    // Validate input
    if (!userId || !name) {
      return NextResponse.json(
        { error: 'Missing userId or name' },
        { status: 400 }
      )
    }

    // Trim inputs
    const trimmedUserId = userId.trim()
    const trimmedName = name.trim()

    if (!trimmedUserId || !trimmedName) {
      return NextResponse.json(
        { error: 'User ID and Name cannot be empty' },
        { status: 400 }
      )
    }

    // Find user in database (must exist for test login)
    const user = await prisma.user.findUnique({
      where: { userId: trimmedUserId },
    })

    if (!user) {
      return NextResponse.json(
        { error: `User ID "${trimmedUserId}" 不存在於資料庫中` },
        { status: 404 }
      )
    }

    // Verify name matches (for test login, we require exact match)
    if (user.name !== trimmedName) {
      return NextResponse.json(
        { error: `Name 不正確。此 User ID 對應的 Name 應為 "${user.name}"` },
        { status: 400 }
      )
    }

    // Create JWT token for test login (similar to local-auth-token)
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'local-dev-secret-key-change-in-production'
    const secretKey = new TextEncoder().encode(secret)
    
    const expires = new Date()
    expires.setDate(expires.getDate() + 30) // 30 days

    const token = await new SignJWT({
      sub: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      image: user.avatarUrl,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(expires.getTime() / 1000))
      .sign(secretKey)

    // Set test-auth-token cookie (independent from NextAuth)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        image: user.avatarUrl,
      },
    })

    // Set test-auth-token cookie (similar to local-auth-token)
    response.cookies.set('test-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    })

    console.log('Test login cookie set: test-auth-token')

    return response
  } catch (error: any) {
    console.error('Test auth error:', error)
    return NextResponse.json(
      { error: error.message || 'Test login failed' },
      { status: 500 }
    )
  }
}

