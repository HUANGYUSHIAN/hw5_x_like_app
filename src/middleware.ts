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
  // 测试登录使用独立的 test-auth-token，与 OAuth 登录分离
  const hasTestAuth = await checkTestAuth(request)
  if (hasTestAuth) {
    // Test login is valid, allow access
    // 测试登录不需要检查 NextAuth token
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Test auth token found, allowing access')
    }
    return NextResponse.next()
  }
  
  // 如果存在 test-auth-token 但验证失败，清除它以避免冲突
  const testToken = request.cookies.get('test-auth-token')?.value
  if (testToken && !hasTestAuth) {
    console.log('[Middleware] Invalid test-auth-token found, will be cleared on logout')
  }

  // Otherwise, use NextAuth
  // 检查所有可能的 cookie 名称
  const cookieNames = [
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
    '__Host-next-auth.session-token',
  ]
  
  const cookies = cookieNames.map(name => ({
    name,
    value: request.cookies.get(name)?.value || null,
  }))
  
  // 在生产环境也输出日志（用于调试）
  if (pathname === '/') {
    console.log('[Middleware] Cookie check:', {
      cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      allCookies: Array.from(request.cookies.getAll()).map(c => c.name),
    })
  }
  
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    // 显式指定 cookie 名称（NextAuth v5 可能需要）
    cookieName: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token',
  })

  // Debug logging (生产环境也输出)
  if (pathname === '/') {
    console.log('[Middleware] Token check:', {
      hasToken: !!token,
      needsRegistration: token?.needsRegistration,
      needsUserIdSetup: token?.needsUserIdSetup,
      userId: token?.userId,
      sub: token?.sub,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
    })
  }

  // If not authenticated, redirect to login
  if (!token) {
    console.log('[Middleware] No token found, redirecting to /auth/signin', {
      pathname,
      cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
    })
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

