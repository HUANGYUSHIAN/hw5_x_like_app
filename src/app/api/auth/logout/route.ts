import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Clear all auth cookies (NextAuth and test login)
  const response = NextResponse.json({ success: true })
  
  // Get all cookies to find all auth-related cookies
  const allCookies = request.cookies.getAll()
  
  // List of all possible NextAuth cookie names
  const nextAuthCookieNames = [
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
    '__Host-next-auth.session-token',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    '__Host-next-auth.callback-url',
  ]
  
  // Clear all NextAuth cookies
  nextAuthCookieNames.forEach(cookieName => {
    response.cookies.delete(cookieName)
    // Also try with path variations
    response.cookies.set(cookieName, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  })
  
  // Clear test-auth-token (backdoor for test login)
  response.cookies.delete('test-auth-token')
  response.cookies.set('test-auth-token', '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  
  // Log cleared cookies for debugging
  console.log('[Logout] Cleared cookies:', {
    nextAuthCookies: nextAuthCookieNames,
    testAuthToken: 'test-auth-token',
    allCookiesFound: allCookies.map(c => c.name),
  })
  
  return response
}


