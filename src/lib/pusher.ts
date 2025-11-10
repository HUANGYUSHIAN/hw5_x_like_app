'use client'

import Pusher from 'pusher-js'

let pusherClientInstance: Pusher | null = null

export const getPusherClient = () => {
  if (typeof window === 'undefined') return null

  if (!pusherClientInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'
    
    if (key) {
      try {
        // Use authorizer function to dynamically get auth headers
        pusherClientInstance = new Pusher(key, {
          cluster,
          authorizer: (channel: any, options: any) => {
            return {
              authorize: (socketId: string, callback: any) => {
                // Get current session dynamically
                const { shouldUseLocalStorage, getLocalSession } = require('@/lib/local-session-storage')
                const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                }
                
                if (shouldUseLocalStorage()) {
                  const session = getLocalSession()
                  if (session) {
                    headers['X-User-Id'] = session.id
                    headers['X-User-UserId'] = session.userId
                  }
                }
                
                // Make the auth request with dynamic headers
                fetch('/api/pusher/auth', {
                  method: 'POST',
                  headers,
                  credentials: 'include',
                  body: JSON.stringify({
                    socket_id: socketId,
                    channel_name: channel.name,
                  }),
                })
                  .then(res => res.json())
                  .then(data => {
                    if (data.error) {
                      callback(new Error(data.error), null)
                    } else {
                      callback(null, data)
                    }
                  })
                  .catch(err => {
                    callback(err, null)
                  })
              },
            }
          },
          // Enable debug logging in development
          enabledTransports: ['ws', 'wss'],
        })

        // Add connection state logging for debugging
        if (process.env.NODE_ENV === 'development') {
          pusherClientInstance.connection.bind('state_change', (states: any) => {
            console.log('[Pusher] Connection state:', states.previous, '->', states.current)
          })
          
          pusherClientInstance.connection.bind('error', (err: any) => {
            console.error('[Pusher] Connection error:', err)
          })
        }
      } catch (error) {
        console.warn('Failed to initialize Pusher client:', error)
        return null
      }
    }
  }

  return pusherClientInstance
}

export const pusherClient = getPusherClient()

