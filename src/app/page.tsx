'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { Box, Button, Tabs, Tab, CircularProgress, Typography, Paper, Avatar, AvatarGroup } from '@mui/material'
import PostCard from '@/components/post/PostCard'
import RepostCard from '@/components/post/RepostCard'
import PostComposer from '@/components/post/PostComposer'
import { PostWithAuthor } from '@/types'
import EditIcon from '@mui/icons-material/Edit'

export default function HomePage() {
  const { data: session } = useSession()
  const [feedItems, setFeedItems] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'following'>('all')
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [newPostAuthors, setNewPostAuthors] = useState<Array<{ id: string; userId: string; name: string; avatarUrl: string | null }>>([])

  useEffect(() => {
    fetchPosts()
  }, [filter, session])

  // Subscribe to Pusher for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id) return

    try {
      const { getPusherClient } = require('@/lib/pusher')
      const pusher = getPusherClient()
      if (!pusher) {
        console.warn('[Pusher] Client not available')
        return
      }

      console.log('[Pusher] Setting up subscriptions for user:', session.user.id)

      // Subscribe to public channel for "all" filter
      const publicChannel = pusher.subscribe('public-posts')
      
      publicChannel.bind('pusher:subscription_succeeded', () => {
        console.log('[Pusher] Successfully subscribed to public-posts')
      })
      
      publicChannel.bind('pusher:subscription_error', (err: any) => {
        console.error('[Pusher] Failed to subscribe to public-posts:', err)
      })
      
      const handlePublicPostCreated = (data: any) => {
        console.log('[Pusher] Received post:created on public-posts:', data)
        // Only refresh if viewing "all" posts
        if (filter === 'all') {
          setCursor(null)
          setHasMore(true)
          fetchPosts(false)
        }
      }
      
      publicChannel.bind('post:created', handlePublicPostCreated)

      // Subscribe to private channel for "following" filter
      // This will receive posts from users that the current user follows
      const privateChannelName = `private-user-${session.user.id}`
      console.log('[Pusher] Subscribing to private channel:', privateChannelName)
      const privateChannel = pusher.subscribe(privateChannelName)
      
      privateChannel.bind('pusher:subscription_succeeded', () => {
        console.log('[Pusher] Successfully subscribed to', privateChannelName)
      })
      
      privateChannel.bind('pusher:subscription_error', (err: any) => {
        console.error('[Pusher] Failed to subscribe to', privateChannelName, ':', err)
      })
      
      const handlePrivatePostCreated = async (data: any) => {
        console.log('[Pusher] Received post:created on', privateChannelName, ':', data)
        
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
        
        // Refresh if viewing "following" posts OR if we're on "all" but want to show new posts from followed users
        // For now, always refresh when we receive a post from a followed user
        setCursor(null)
        setHasMore(true)
        fetchPosts(false)
      }
      
      privateChannel.bind('post:created', handlePrivatePostCreated)

      return () => {
        try {
          console.log('[Pusher] Unsubscribing from channels')
          publicChannel.unbind('post:created', handlePublicPostCreated)
          publicChannel.unbind('pusher:subscription_succeeded')
          publicChannel.unbind('pusher:subscription_error')
          pusher.unsubscribe('public-posts')
          privateChannel.unbind('post:created', handlePrivatePostCreated)
          privateChannel.unbind('pusher:subscription_succeeded')
          privateChannel.unbind('pusher:subscription_error')
          pusher.unsubscribe(privateChannelName)
        } catch (error) {
          console.warn('[Pusher] Error unsubscribing:', error)
        }
      }
    } catch (error) {
      console.warn('[Pusher] Error setting up subscriptions:', error)
    }
  }, [filter, session]) // Re-subscribe when filter or session changes

  const fetchPosts = async (loadMore = false) => {
    try {
      setLoading(true)
      const url = `/api/posts?filter=${filter}&limit=20${cursor && loadMore ? `&cursor=${cursor}` : ''}`
      
      // Use authenticated fetch if in localStorage mode
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
      
      const response = await fetch(url, { headers, credentials: 'include' })
      
      if (response.ok) {
        const data = await response.json()
        if (loadMore) {
          setFeedItems((prev) => [...prev, ...(data.items || [])])
        } else {
          setFeedItems(data.items || [])
        }
        setCursor(data.nextCursor)
        setHasMore(data.nextCursor !== null)
      } else {
        // Handle API errors
        const error = await response.json().catch(() => ({ error: 'Failed to fetch posts' }))
        console.error('Fetch posts error:', error)
        // Don't clear existing posts on error, just log it
        if (!loadMore) {
          // Only clear posts if it's the initial load
          setFeedItems([])
        }
      }
    } catch (error) {
      console.error('Fetch posts error:', error)
      // Don't clear existing posts on network error
      if (!loadMore) {
        setFeedItems([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && cursor) {
      fetchPosts(true)
    }
  }

  const handlePost = () => {
    fetchPosts()
  }

  const handleNewPostsClick = () => {
    setNewPostAuthors([])
    fetchPosts()
  }

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
        <Tabs value={filter} onChange={(_, value) => { setFilter(value); setCursor(null); setHasMore(true); }}>
          <Tab label="All" value="all" />
          <Tab label="Following" value="following" />
        </Tabs>
      </Box>
      {/* New post notification is now handled by GlobalPostNotification component */}
      {session && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setComposerOpen(true)}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            What's happening?
          </Button>
        </Box>
      )}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {feedItems.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No posts yet
              </Typography>
            </Box>
          ) : (
            <>
              {feedItems.map((item) => {
                if (item.type === 'post') {
                  return <PostCard key={item.id} post={item.data} onPost={handlePost} />
                } else if (item.type === 'repost') {
                  return (
                    <RepostCard
                      key={item.id}
                      repostedBy={item.data.repostedBy}
                      post={item.data.post}
                      onPost={handlePost}
                    />
                  )
                }
                return null
              })}
              {hasMore && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Button onClick={handleLoadMore} variant="outlined">
                    Load More
                  </Button>
                </Box>
              )}
            </>
          )}
        </>
      )}
      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPost={handlePost}
      />
    </Box>
  )
}
