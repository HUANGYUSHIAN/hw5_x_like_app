import Pusher from 'pusher'

// Only create Pusher instance if credentials are provided
let pusherServerInstance: Pusher | null = null

export const pusherServer = (() => {
  if (pusherServerInstance) {
    return pusherServerInstance
  }

  // Support both naming conventions for flexibility
  const appId = process.env.PUSHER_APP_ID || process.env.NEXT_PUBLIC_PUSHER_APP_ID
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  if (appId && key && secret) {
    pusherServerInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
    return pusherServerInstance
  }

  // Return a mock Pusher instance if credentials are not provided
  return {
    trigger: async () => {
      // Silently fail if Pusher is not configured
      console.log('Pusher not configured, skipping real-time update')
    },
    authorizeChannel: () => ({}),
  } as any
})()



