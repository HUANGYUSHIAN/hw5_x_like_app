'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useRouter } from 'next/navigation'
import { usePusher } from '@/hooks/usePusher'
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  AvatarGroup,
} from '@mui/material'

interface NewPostAuthor {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
}

export default function GlobalPostNotification() {
  const { data: session } = useSession()
  const router = useRouter()
  const [newPostAuthors, setNewPostAuthors] = useState<NewPostAuthor[]>([])

  // Subscribe to Pusher for new posts from followed users
  usePusher(
    session?.user?.id ? `private-user-${session.user.id}` : null,
    'post:created',
    async (data: any) => {
      console.log('[GlobalPostNotification] Received post:created:', data)
      
      // Fetch author info for new post notification
      if (data.authorUserId) {
        try {
          const { shouldUseLocalStorage, getLocalSession } = await import('@/lib/local-session-storage')
          let headers: HeadersInit = {}
          if (shouldUseLocalStorage()) {
            const localSession = getLocalSession()
            if (localSession) {
              headers = {
                'X-User-Id': localSession.id,
                'X-User-UserId': localSession.userId,
              }
            }
          }
          
          const userResponse = await fetch(`/api/users/${data.authorUserId}`, { headers, credentials: 'include' })
          if (userResponse.ok) {
            const user = await userResponse.json()
            setNewPostAuthors((prev) => {
              const existing = prev.find((a) => a.id === user.id)
              if (existing) return prev
              const updated = [user, ...prev].slice(0, 3) // Keep max 3
              return updated
            })
          }
        } catch (error) {
          console.error('Error fetching author info:', error)
        }
      }
    }
  )

  const handleShowPosts = () => {
    setNewPostAuthors([])
    router.push('/')
  }

  if (newPostAuthors.length === 0 || !session) {
    return null
  }

  return (
    <Paper
      sx={{
        p: 2,
        m: 2,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
      onClick={handleShowPosts}
    >
      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.875rem' } }}>
        {newPostAuthors.map((author) => (
          <Avatar key={author.id} src={author.avatarUrl || undefined}>
            {author.name[0]}
          </Avatar>
        ))}
      </AvatarGroup>
      <Typography variant="body2" sx={{ flexGrow: 1 }}>
        {newPostAuthors.length === 1
          ? `${newPostAuthors[0].name} posted`
          : `${newPostAuthors.length} people posted`}
      </Typography>
      <Button
        variant="contained"
        size="small"
        sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
        onClick={(e) => {
          e.stopPropagation()
          handleShowPosts()
        }}
      >
        Show
      </Button>
    </Paper>
  )
}

