/**
 * 本地認證工具函數
 * 當 LOCAL_AUTH=true 時使用，不依賴 NextAuth
 */

import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

// Lazy load Prisma to avoid WASM issues
let prisma: any = null
async function getPrisma() {
  if (!prisma) {
    try {
      const { prisma: prismaClient } = await import('./prisma')
      prisma = prismaClient
    } catch (error) {
      console.error('Failed to load Prisma:', error)
      throw error
    }
  }
  return prisma
}

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'local-dev-secret-key-change-in-production'
)

export interface LocalAuthSession {
  user: {
    id: string
    userId: string
    name: string
    email: string | null
    image: string | null
  }
  expires: string
}

/**
 * 創建本地認證 token
 */
export async function createLocalAuthToken(userId: string): Promise<string> {
  const db = await getPrisma()
  const user = await db.user.findUnique({
    where: { userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

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
    .setExpirationTime(expires.getTime())
    .sign(SECRET)

  return token
}

/**
 * 驗證本地認證 token
 */
export async function verifyLocalAuthToken(token: string): Promise<LocalAuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)

    if (!payload.sub) {
      return null
    }

    // Get user from database to ensure it still exists
    const db = await getPrisma()
    const user = await db.user.findUnique({
      where: { id: payload.sub as string },
    })

    if (!user) {
      return null
    }

    return {
      user: {
        id: user.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        image: user.avatarUrl,
      },
      expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : new Date().toISOString(),
    }
  } catch (error) {
    return null
  }
}

/**
 * 從 request 中獲取本地認證 session
 */
export async function getLocalAuthSession(request: NextRequest): Promise<LocalAuthSession | null> {
  const token = request.cookies.get('local-auth-token')?.value

  if (!token) {
    return null
  }

  return await verifyLocalAuthToken(token)
}

/**
 * 設置認證 cookie
 */
export function setAuthCookie(response: NextResponse, token: string) {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30) // 30 days

  response.cookies.set('local-auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  })

  return response
}

/**
 * 清除認證 cookie
 */
export function clearAuthCookie(response: NextResponse) {
  response.cookies.delete('local-auth-token')
  return response
}

