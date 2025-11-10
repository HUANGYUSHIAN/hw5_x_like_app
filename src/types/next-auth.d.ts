import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      userId?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
    needsRegistration?: boolean
    needsUserIdSetup?: boolean
    provider?: string
    providerId?: string
    expires?: string
    // 记录登录用的标识（ID 或 email）
    loginIdentifier?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string
    userId?: string
    needsRegistration?: boolean
    needsUserIdSetup?: boolean
    provider?: string
    providerId?: string
    email?: string
    name?: string
    image?: string
    // 记录登录用的标识（ID 或 email）
    loginIdentifier?: string
  }
}

