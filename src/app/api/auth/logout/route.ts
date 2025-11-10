import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Clear all auth cookies (NextAuth and test login)
  const response = NextResponse.json({ success: true })
  
  // Clear NextAuth cookies
  const cookieName = process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token'

  response.cookies.delete(cookieName)
  
  // Also clear production cookie if in development
  if (process.env.NODE_ENV === 'development') {
    response.cookies.delete('__Secure-next-auth.session-token')
  }
  
  // Clear test-auth-token (backdoor for test login)
  response.cookies.delete('test-auth-token')
  
  return response
}


