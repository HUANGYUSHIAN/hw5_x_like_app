import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose'

/**
 * 檢查測試登入 token（後門機制）
 */
async function checkTestAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('test-auth-token')?.value
  if (!token) {
    return false
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'local-dev-secret-key-change-in-production'
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    return !!payload.sub
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow access to auth pages and API routes
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // First, check for test-auth-token (backdoor for test login)
  const hasTestAuth = await checkTestAuth(request)
  if (hasTestAuth) {
    // Test login is valid, allow access
    return NextResponse.next()
  }

  // Otherwise, use NextAuth
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && pathname === '/') {
    console.log('[Middleware] Token check:', {
      hasToken: !!token,
      needsRegistration: token?.needsRegistration,
      needsUserIdSetup: token?.needsUserIdSetup,
      userId: token?.userId,
      sub: token?.sub,
    })
  }

  // If not authenticated, redirect to login
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] No token found, redirecting to /auth/signin')
    }
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // If user needs registration (OAuth info but no user created), redirect to registration page
  if (token.needsRegistration) {
    if (pathname !== '/auth/register' && !pathname.startsWith('/api/auth/register')) {
      return NextResponse.redirect(new URL('/auth/register', request.url))
    }
    return NextResponse.next()
  }

  // If user needs to set userId (has temporary userId), redirect to profile edit
  if (token.needsUserIdSetup && token.userId) {
    const editPath = `/${token.userId}/edit`
    if (pathname !== editPath && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL(editPath, request.url))
    }
    return NextResponse.next()
  }

  // If user is registered but on registration page, redirect to home
  if (!token.needsRegistration && pathname === '/auth/register') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
}

