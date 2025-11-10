import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token || !token.needsRegistration) {
      return NextResponse.json(
        { error: 'Not authorized for registration' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = body

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const trimmedUserId = userId.trim()

    if (trimmedUserId.length === 0) {
      return NextResponse.json(
        { error: 'User ID cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedUserId.length > 20) {
      return NextResponse.json(
        { error: 'User ID must be 20 characters or less' },
        { status: 400 }
      )
    }

    // Only lowercase letters and numbers
    if (!/^[a-z0-9]+$/.test(trimmedUserId)) {
      return NextResponse.json(
        { error: 'User ID can only contain lowercase letters (a-z) and numbers (0-9)' },
        { status: 400 }
      )
    }

    // Check if userId is already taken
    const existingUser = await prisma.user.findUnique({
      where: { userId: trimmedUserId },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User ID is already taken' },
        { status: 400 }
      )
    }

    // Create user with OAuth info from token
    // email 是必需的（OAuth 登录必须有 email）
    if (!token.email) {
      return NextResponse.json(
        { error: 'Email is required for OAuth registration' },
        { status: 400 }
      )
    }
    
    // 检查 email 是否已被使用
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: token.email as string },
    })
    
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      )
    }
    
    const user = await prisma.user.create({
      data: {
        userId: trimmedUserId,
        name: (token.name as string) || 'User',
        email: token.email as string, // email 是必需的
        avatarUrl: (token.image as string) || null,
        provider: token.provider as string,
        providerId: token.providerId as string,
      },
    })

    // Create new JWT token with registration complete
    // user.id is MongoDB ObjectID (24 hex characters)
    const secret = process.env.NEXTAUTH_SECRET || 'test-secret'
    const maxAge = 30 * 24 * 60 * 60 // 30 days

    const newToken = await encode({
      token: {
        sub: user.id, // MongoDB ObjectID (24 hex characters)
        userId: user.userId,
        name: user.name,
        email: user.email,
        image: user.avatarUrl,
        needsRegistration: false,
        // 记录登录标识：优先使用 email，如果没有则使用 userId
        loginIdentifier: user.email || user.userId,
      },
      secret,
      salt: 'next-auth.session-token',
      maxAge,
    })

    // Update cookie with new token
    console.log('[Register] ✓ 註冊成功:', {
      userId: user.userId,
      email: user.email,
      id: user.id,
    })
    
    const response = NextResponse.json({
      success: true,
      message: '註冊成功！歡迎加入！',
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        image: user.avatarUrl,
      },
    })

    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token'

    response.cookies.set(cookieName, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    
    if (error.code === 'P2002') {
      // Unique constraint violation
      return NextResponse.json(
        { error: 'User ID is already taken' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

