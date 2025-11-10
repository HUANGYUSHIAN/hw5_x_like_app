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
              setSession({
                id: data.user.id,
                userId: data.user.userId,
                name: data.user.name,
                email: data.user.email,
                image: data.user.image,
                token: 'cookie-token', // Placeholder
              })
              setStatus('authenticated')
            } else {
              setSession(null)
              setStatus('unauthenticated')
            }
          })
          .catch(() => {
            setSession(null)
            setStatus('unauthenticated')
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

export function SessionProvider({ children }: { children: ReactNode }) {
  // Check if we should use localStorage mode (only on client side)
  // On server side, always use NextAuthSessionProvider
  // For OAuth and test login, always use NextAuthSessionProvider
  if (typeof window !== 'undefined' && shouldUseLocalStorage()) {
    return <LocalSessionProvider>{children}</LocalSessionProvider>
  }
  // Use NextAuth SessionProvider with refetchInterval to auto-refresh session
  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window gains focus
    >
      {children}
    </NextAuthSessionProvider>
  )
}

// Custom hook to use session
export function useSession() {
  // Check if we should use localStorage mode (only on client side)
  if (typeof window !== 'undefined' && shouldUseLocalStorage()) {
    const context = useContext(LocalSessionContext)
    return context || { data: null, status: 'loading' }
  }
  return useNextAuthSession()
}





