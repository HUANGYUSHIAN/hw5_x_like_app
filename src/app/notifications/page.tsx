'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Avatar,
  Button,
  IconButton,
} from '@mui/material'
import FavoriteIcon from '@mui/icons-material/Favorite'
import CommentIcon from '@mui/icons-material/Comment'
import RepeatIcon from '@mui/icons-material/Repeat'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CreateIcon from '@mui/icons-material/Create'
import RelativeTime from '@/components/utils/RelativeTime'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'like' | 'comment' | 'repost' | 'follow' | 'post'
  actor: {
    id: string
    userId: string
    name: string
    avatarUrl: string | null
  }
  post: {
    id: string
    author: {
      id: string
      userId: string
      name: string
      avatarUrl: string | null
    }
    content: string
  } | null
  comment: {
    id: string
    author: {
      id: string
      userId: string
      name: string
      avatarUrl: string | null
    }
    content: string
  } | null
  read: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/auth/local')
      return
    }
    fetchNotifications()
  }, [session])

  const fetchNotifications = async (loadMore = false) => {
    try {
      setLoading(true)
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

      const url = `/api/notifications?limit=50${cursor && loadMore ? `&cursor=${cursor}` : ''}`
      const response = await fetch(url, { headers, credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        if (loadMore) {
          setNotifications((prev) => [...prev, ...(data.items || [])])
        } else {
          setNotifications(data.items || [])
        }
        setCursor(data.nextCursor)
        setHasMore(data.nextCursor !== null)

        // Mark as read
        if (!loadMore && data.items && data.items.length > 0) {
          const unreadIds = data.items.filter((n: Notification) => !n.read).map((n: Notification) => n.id)
          if (unreadIds.length > 0) {
            await fetch('/api/notifications/read', {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ notificationIds: unreadIds }),
            })
          }
        }
      }
    } catch (error) {
      console.error('Fetch notifications error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && cursor) {
      fetchNotifications(true)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <FavoriteIcon sx={{ color: 'error.main' }} />
      case 'comment':
        return <CommentIcon sx={{ color: 'primary.main' }} />
      case 'repost':
        return <RepeatIcon sx={{ color: 'success.main' }} />
      case 'follow':
        return <PersonAddIcon sx={{ color: 'primary.main' }} />
      case 'post':
        return <CreateIcon sx={{ color: 'primary.main' }} />
      default:
        return null
    }
  }

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.name
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your post`
      case 'comment':
        return `${actorName} commented on your post`
      case 'repost':
        return `${actorName} reposted your post`
      case 'follow':
        return `${actorName} followed you`
      case 'post':
        return `${actorName} posted`
      default:
        return ''
    }
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.type === 'follow') {
      return `/${notification.actor.userId}`
    }
    if (notification.type === 'post' && notification.post) {
      return `/posts/${notification.post.id}`
    }
    if (notification.post) {
      return `/posts/${notification.post.id}`
    }
    return '/'
  }

  if (loading && notifications.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight="bold">
          Notifications
        </Typography>
      </Box>

      {notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No notifications yet
          </Typography>
        </Box>
      ) : (
        <>
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={getNotificationLink(notification)}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Paper
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  cursor: 'pointer',
                  bgcolor: notification.read ? 'background.paper' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={notification.actor.avatarUrl || undefined}
                    sx={{ width: 48, height: 48 }}
                  >
                    {notification.actor.name[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getNotificationIcon(notification.type)}
                      <Typography variant="body2" fontWeight="bold">
                        {getNotificationText(notification)}
                      </Typography>
                      {notification.read && (
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 'auto' }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      <RelativeTime date={notification.createdAt} />
                    </Typography>
                    {(notification.post || notification.comment) && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" noWrap>
                          {notification.comment?.content || notification.post?.content}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Link>
          ))}
          {hasMore && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Button onClick={handleLoadMore} variant="outlined">
                Load More
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

