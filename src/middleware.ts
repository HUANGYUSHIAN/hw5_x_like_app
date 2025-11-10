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

  // 完全跳过 OAuth callback 路由（NextAuth 需要直接处理，不能有任何拦截）
  // 这是最优先的检查，确保 callback 路由完全不被 middleware 处理
  // 这样可以避免丢失 authorization code（特别是当 GitHub 临时限制时）
  if (pathname.startsWith('/api/auth/callback/')) {
    // 添加日志以便诊断（但不在生产环境输出太多）
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] 跳过 OAuth callback 路由:', pathname)
    }
    return NextResponse.next()
  }

  // Allow access to API routes (不需要认证检查)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // /auth/signin 允许访问（不需要认证）
  if (pathname === '/auth/signin') {
    return NextResponse.next()
  }
  
  // /auth/register 需要检查 token.needsRegistration，所以不能跳过 middleware
  // 如果用户需要注册，允许访问；如果已注册，重定向到首页

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
  // 但如果是 /auth/register 且没有 token，可能是 OAuth 回调后 cookie 还没设置，允许访问
  if (!token) {
    // 如果是注册页面，允许访问（OAuth 回调后可能需要一点时间设置 cookie）
    if (pathname === '/auth/register') {
      console.log('[Middleware] No token found but on /auth/register, allowing access (OAuth callback may be in progress)')
      return NextResponse.next()
    }
    console.log('[Middleware] No token found, redirecting to /auth/signin', {
      pathname,
      cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
    })
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // If user needs registration (OAuth info but no user created), redirect to registration page
  if (token.needsRegistration) {
    console.log('[Middleware] User needs registration, redirecting to /auth/register', {
      pathname,
      hasToken: !!token,
      needsRegistration: token.needsRegistration,
      email: token.email,
      provider: token.provider,
    })
    if (pathname !== '/auth/register' && !pathname.startsWith('/api/auth/register')) {
      return NextResponse.redirect(new URL('/auth/register', request.url))
    }
    return NextResponse.next()
  }

  // If user needs to set userId (has temporary userId), redirect to profile edit
  if (token.needsUserIdSetup && token.userId) {
    const editPath = `/${token.userId}/edit`
    console.log('[Middleware] User needs to set userId, redirecting to:', editPath, {
      userId: token.userId,
      pathname,
    })
    if (pathname !== editPath && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL(editPath, request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes，包括 /api/auth/callback/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/signin (登录页面，不需要认证)
     * 
     * 注意：
     * - /api/auth/callback/* 必须被排除，确保 OAuth callback 不被拦截
     * - /auth/register 需要被 middleware 检查，以验证 token.needsRegistration
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth/signin).*)',
  ],
}

