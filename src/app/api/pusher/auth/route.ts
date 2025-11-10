import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    
    if (!session.user?.id) {
      console.warn('[Pusher Auth] Unauthorized: No session user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { socket_id, channel_name } = body

    console.log('[Pusher Auth] Request for channel:', channel_name, 'by user:', session.user.id)

    // Only allow private channels for the authenticated user
    if (channel_name.startsWith('private-user-')) {
      const userId = channel_name.replace('private-user-', '')
      
      if (userId !== session.user.id) {
        console.warn('[Pusher Auth] Forbidden: User', session.user.id, 'tried to access channel for user', userId)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const auth = pusherServer.authorizeChannel(socket_id, channel_name)
      console.log('[Pusher Auth] Authorized private channel:', channel_name)
      return NextResponse.json(auth)
    }

    // Public channels don't need auth
    if (channel_name === 'public-posts') {
      const auth = pusherServer.authorizeChannel(socket_id, channel_name)
      console.log('[Pusher Auth] Authorized public channel:', channel_name)
      return NextResponse.json(auth)
    }

    console.warn('[Pusher Auth] Invalid channel:', channel_name)
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  } catch (error) {
    console.error('[Pusher Auth] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

