import NextAuth from 'next-auth'
import { authOptions } from './authOptions'

// NextAuth v5 beta 的正确导出方式
// 尝试使用新的 API (返回 { handlers, auth, signIn, signOut })
// 如果失败，回退到旧的 API (直接返回 handler)

let GET: any
let POST: any

try {
  // 在生产环境也输出日志，帮助调试
  console.log('[NextAuth] Initializing NextAuth...')
  console.log('[NextAuth] Providers count:', authOptions.providers?.length || 0)
  
  const authResult = NextAuth(authOptions)
  
  // 调试：检查 NextAuth 返回的结构
  console.log('[NextAuth] NextAuth result type:', typeof authResult)
  if (authResult && typeof authResult === 'object') {
    console.log('[NextAuth] NextAuth result keys:', Object.keys(authResult))
  }
  
  // 尝试新 API (NextAuth v5 beta)
  if (authResult && typeof authResult === 'object' && 'handlers' in authResult) {
    const { handlers } = authResult as { handlers: { GET: any; POST: any } }
    GET = handlers.GET
    POST = handlers.POST
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Using NextAuth v5 beta handlers API')
    }
  } 
  // 尝试旧 API (NextAuth v4 或某些 v5 beta 版本)
  else if (typeof authResult === 'function') {
    GET = authResult
    POST = authResult
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Using NextAuth function handler')
    }
  }
  // 如果返回对象但没有 handlers，尝试直接使用对象
  else if (authResult && typeof authResult === 'object') {
    if ('GET' in authResult && 'POST' in authResult) {
      GET = (authResult as any).GET
      POST = (authResult as any).POST
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Using NextAuth object with GET/POST methods')
      }
    } else {
      // 最后尝试：对象本身就是 handler
      GET = authResult
      POST = authResult
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Using NextAuth object as handler')
      }
    }
  } else {
    throw new Error('NextAuth returned an unexpected type')
  }
} catch (error: any) {
  console.error('❌ NextAuth initialization failed:', error)
  throw new Error(`Failed to initialize NextAuth: ${error.message}`)
}

// 验证 GET 和 POST 是否存在
if (!GET || !POST) {
  throw new Error('NextAuth handlers (GET/POST) are not available')
}

// App Router 必须使用这种导出方式
// 这确保了 /api/auth/providers 和 /api/auth/callback/* 都能正常工作
export { GET, POST }

