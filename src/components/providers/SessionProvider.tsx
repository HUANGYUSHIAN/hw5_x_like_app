'use client'

import { SessionProvider as NextAuthSessionProvider, useSession as useNextAuthSession } from 'next-auth/react'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { getLocalSession, shouldUseLocalStorage, LocalSessionData } from '@/lib/local-session-storage'

// Create a custom session context for localStorage mode
const LocalSessionContext = createContext<{
  data: any
  status: 'loading' | 'authenticated' | 'unauthenticated'
} | null>(null)

function LocalSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LocalSessionData | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    const updateSession = () => {
      if (shouldUseLocalStorage()) {
        const localSession = getLocalSession()
        if (localSession) {
          setSession(localSession)
          setStatus('authenticated')
        } else {
          setSession(null)
          setStatus('unauthenticated')
        }
      } else {
        // If not using localStorage, still try to get session from API
        // This handles the case where localStorage mode is disabled but user is logged in via cookie
        fetch('/api/auth/session', { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data && data.user) {
              // Convert API session to LocalSessionData format
              const sessionData = {
                id: data.user.id,
                userId: data.user.userId,
                name: data.user.name,
                email: data.user.email,
                image: data.user.image,
                token: 'cookie-token', // Placeholder
              }
              setSession(sessionData)
              setStatus('authenticated')
              // 保存 userID 到 localStorage（确保持久化，即使使用 cookie 模式）
              if (data.user.userId) {
                localStorage.setItem('userID', data.user.userId)
                console.log('[SessionProvider] 保存 userID 到 localStorage:', data.user.userId)
              }
            } else {
              setSession(null)
              setStatus('unauthenticated')
              localStorage.removeItem('userID')
            }
          })
          .catch(() => {
            setSession(null)
            setStatus('unauthenticated')
            localStorage.removeItem('userID')
          })
      }
    }

    // Initial session load
    updateSession()

    // Listen for custom events (when login happens in same tab)
    const handleCustomEvent = () => {
      updateSession()
    }

    // 注意：在開發模式下，我們不監聽 storage 事件
    // 因為我們希望每個分頁可以獨立登入不同的用戶
    // 如果監聽 storage 事件，當一個分頁登入時，其他分頁會同步更新
    // 這會導致無法同時登入 User A, B, C 來測試 Pusher 功能
    
    // 只在當前分頁登入時更新（通過自定義事件）
    if (shouldUseLocalStorage()) {
      window.addEventListener('localStorage', handleCustomEvent as EventListener)
    }

    return () => {
      if (shouldUseLocalStorage()) {
        window.removeEventListener('localStorage', handleCustomEvent as EventListener)
      }
    }
  }, [])


  const value = session ? {
    data: {
      user: {
        id: session.id,
        userId: session.userId,
        name: session.name,
        email: session.email,
        image: session.image,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    status,
  } : { data: null, status }

  return (
    <LocalSessionContext.Provider value={value}>
      {children}
    </LocalSessionContext.Provider>
  )
}

// 额外的 Provider 来同步 userID 到 localStorage 并处理测试登录
function SessionSyncProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useNextAuthSession()
  const [customSession, setCustomSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // 如果 NextAuth session 为空，尝试从自定义 session API 获取（用于测试登录）
    if (status === 'unauthenticated' || !session) {
      fetch('/api/auth/session', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data && data.user) {
            setCustomSession(data)
            // 保存 userID 到 localStorage
            if (data.user.userId) {
              localStorage.setItem('userID', data.user.userId)
              console.log('[SessionSyncProvider] 从自定义 API 获取 session，保存 userID:', data.user.userId)
            }
          } else {
            setCustomSession(null)
            localStorage.removeItem('userID')
          }
        })
        .catch(() => {
          setCustomSession(null)
          // 如果 API 调用失败，尝试从 localStorage 恢复 userID（用于测试登录）
          const savedUserId = localStorage.getItem('userID')
          if (savedUserId) {
            console.log('[SessionSyncProvider] API 调用失败，保留 localStorage 中的 userID:', savedUserId)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setCustomSession(null)
      setLoading(false)
      // 保存 userID 到 localStorage
      if (session?.user?.userId) {
        localStorage.setItem('userID', session.user.userId)
        console.log('[SessionSyncProvider] 从 NextAuth session 保存 userID:', session.user.userId)
      }
    }
  }, [status, session])
  
  return <>{children}</>
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Check if we should use localStorage mode (only on client side)
  // On server side, always use NextAuthSessionProvider
  // For OAuth and test login, always use NextAuthSessionProvider
  if (typeof window !== 'undefined' && shouldUseLocalStorage()) {
    return <LocalSessionProvider>{children}</LocalSessionProvider>
  }
  // Use NextAuth SessionProvider with refetchInterval to auto-refresh session
  // 但是我们需要自定义 useSession hook 来同时支持 test-auth-token
  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window gains focus
    >
      <SessionSyncProvider>{children}</SessionSyncProvider>
    </NextAuthSessionProvider>
  )
}

// Custom hook to use session
export function useSession() {
  // Check if we should use localStorage mode (only on client side)
  if (typeof window !== 'undefined' && shouldUseLocalStorage()) {
    const context = useContext(LocalSessionContext)
    const result = context || { data: null, status: 'loading' }
    // 保存 userID 到 localStorage
    if (result.data?.user?.userId) {
      localStorage.setItem('userID', result.data.user.userId)
    }
    return result
  }
  
  // For OAuth and test login, use NextAuth session but also check our custom session API
  const nextAuthSession = useNextAuthSession()
  const [customSession, setCustomSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // 只有在 NextAuth session 明确为 unauthenticated 时，才尝试从自定义 session API 获取（用于测试登录）
    // 如果 status 是 'loading'，等待 NextAuth 完成加载
    if (nextAuthSession.status === 'loading') {
      setLoading(true)
      return
    }
    
    // NextAuth session 存在且已认证，优先使用
    if (nextAuthSession.status === 'authenticated' && nextAuthSession.data) {
      setCustomSession(null)
      setLoading(false)
      // 保存 userID 到 localStorage
      if (nextAuthSession.data?.user?.userId) {
        localStorage.setItem('userID', nextAuthSession.data.user.userId)
        console.log('[useSession] 从 NextAuth session 保存 userID:', nextAuthSession.data.user.userId)
      }
      return
    }
    
    // 只有在明确 unauthenticated 时，才尝试自定义 session API（测试登录）
    if (nextAuthSession.status === 'unauthenticated') {
      fetch('/api/auth/session', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data && data.user) {
            setCustomSession(data)
            // 保存 userID 到 localStorage
            if (data.user.userId) {
              localStorage.setItem('userID', data.user.userId)
              console.log('[useSession] 从自定义 API 获取 session（测试登录），保存 userID:', data.user.userId)
            }
          } else {
            setCustomSession(null)
            localStorage.removeItem('userID')
          }
        })
        .catch(() => {
          setCustomSession(null)
          // 如果 API 调用失败，尝试从 localStorage 恢复 userID（用于测试登录）
          const savedUserId = localStorage.getItem('userID')
          if (savedUserId) {
            console.log('[useSession] API 调用失败，保留 localStorage 中的 userID:', savedUserId)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // 其他状态，清除自定义 session
      setCustomSession(null)
      setLoading(false)
    }
  }, [nextAuthSession.status, nextAuthSession.data])
  
  // 优先使用 NextAuth session（OAuth 登录）
  if (nextAuthSession.status === 'authenticated' && nextAuthSession.data) {
    return nextAuthSession
  }
  
  // 如果 NextAuth 还在加载，返回 loading 状态
  if (nextAuthSession.status === 'loading' || loading) {
    return { data: null, status: 'loading' as const }
  }
  
  // 只有在 NextAuth 明确 unauthenticated 时，才使用自定义 session（测试登录）
  if (nextAuthSession.status === 'unauthenticated' && customSession) {
    return {
      data: customSession,
      status: 'authenticated' as const,
    }
  }
  
  // 默认返回 unauthenticated
  return { data: null, status: 'unauthenticated' as const }
}





