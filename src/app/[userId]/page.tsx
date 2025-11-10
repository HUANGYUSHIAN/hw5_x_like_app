'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useParams, useRouter } from 'next/navigation'
import { Box, CircularProgress, IconButton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileTabs from '@/components/profile/ProfileTabs'
import PostCard from '@/components/post/PostCard'
import RepostCard from '@/components/post/RepostCard'
import { UserWithCounts, PostWithAuthor } from '@/types'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { data: session } = useSession()
  const [user, setUser] = useState<UserWithCounts | null>(null)
  const [postsAndReposts, setPostsAndReposts] = useState<any[]>([])
  const [likes, setLikes] = useState<PostWithAuthor[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowedBy, setIsFollowedBy] = useState(false)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = session?.user?.userId === userId

  useEffect(() => {
    fetchUser()
    fetchFollowingStatus()
  }, [userId])

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPostsAndReposts()
    } else if (activeTab === 'likes' && isOwnProfile) {
      fetchLikes()
    }
  }, [userId, activeTab, isOwnProfile])

  // Subscribe to Pusher for real-time follower updates
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return

    try {
      const { getPusherClient } = require('@/lib/pusher')
      const pusher = getPusherClient()
      if (!pusher) {
        console.warn('[Pusher] Client not available')
        return
      }

      const channelName = `private-user-${user.id}`
      const channel = pusher.subscribe(channelName)

      channel.bind('pusher:subscription_succeeded', () => {
        console.log('[Pusher] Successfully subscribed to', channelName, 'for follower updates')
      })

      channel.bind('user:followed', () => {
        console.log('[Pusher] Received user:followed event')
        fetchUser() // Refresh user to update follower count
      })

      channel.bind('user:unfollowed', () => {
        console.log('[Pusher] Received user:unfollowed event')
        fetchUser() // Refresh user to update follower count
      })

      return () => {
        try {
          channel.unbind('user:followed')
          channel.unbind('user:unfollowed')
          pusher.unsubscribe(channelName)
        } catch (error) {
          console.warn('[Pusher] Error unsubscribing:', error)
        }
      }
    } catch (error) {
      console.warn('[Pusher] Error setting up follower subscription:', error)
    }
  }, [user?.id])

  const fetchUser = async () => {
    try {
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
      
      const response = await fetch(`/api/users/${userId}`, { headers, credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      }
    } catch (error) {
      console.error('Fetch user error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFollowingStatus = async () => {
    if (!session?.user?.id || isOwnProfile) return

    try {
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
      
      const response = await fetch(`/api/users/${userId}/follow-status`, { headers, credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.isFollowing || false)
        setIsFollowedBy(data.isFollowedBy || false)
      }
    } catch (error) {
      console.error('Fetch following status error:', error)
    }
  }

  const fetchPostsAndReposts = async () => {
    try {
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

      const response = await fetch(`/api/users/${userId}/posts-and-reposts`, {
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Fill in repostedBy name from user data for reposts
        const itemsWithName = data.items.map((item: any) => {
          if (item.type === 'repost') {
            return {
              ...item,
              data: {
                ...item.data,
                repostedBy: {
                  ...item.data.repostedBy,
                  name: user?.name || '',
                },
              },
            }
          }
          return item
        })
        setPostsAndReposts(itemsWithName || [])
      }
    } catch (error) {
      console.error('Fetch posts and reposts error:', error)
      setPostsAndReposts([])
    }
  }

  const fetchLikes = async () => {
    if (!isOwnProfile) return
    
    try {
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

      const response = await fetch(`/api/users/${userId}/likes`, {
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setLikes(data.items || [])
      } else if (response.status === 403) {
        // Unauthorized - user trying to view someone else's likes
        setLikes([])
      }
    } catch (error) {
      console.error('Fetch likes error:', error)
      setLikes([])
    }
  }

  const handleFollow = async () => {
    try {
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
      
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Update follow status based on action
        setIsFollowing(data.action === 'followed')
        fetchUser() // Refresh user to update follower count
        fetchFollowingStatus() // Refresh follow status
      }
    } catch (error) {
      console.error('Follow error:', error)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <Box sx={{ p: 4 }}>User not found</Box>
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <IconButton onClick={() => router.push('/')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          {user.name}
        </Typography>
      </Box>
      <ProfileHeader
        user={user}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        isFollowedBy={isFollowedBy}
        onFollow={handleFollow}
      />
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showLikes={isOwnProfile}
      />
      <Box>
        {activeTab === 'posts' ? (
          postsAndReposts.length > 0 ? (
            postsAndReposts.map((item) => {
              if (item.type === 'post') {
                return <PostCard key={item.id} post={item.data} onPost={() => fetchPostsAndReposts()} />
              } else if (item.type === 'repost') {
                return (
                  <RepostCard
                    key={item.id}
                    repostedBy={item.data.repostedBy}
                    post={item.data.post}
                    onPost={() => fetchPostsAndReposts()}
                  />
                )
              }
              return null
            })
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>No posts yet</Box>
          )
        ) : activeTab === 'likes' && isOwnProfile ? (
          likes.length > 0 ? (
            likes.map((post) => <PostCard key={post.id} post={post} onPost={() => fetchLikes()} />)
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>No likes yet</Box>
          )
        ) : null}
      </Box>
    </Box>
  )
}





