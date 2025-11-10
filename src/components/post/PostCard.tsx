'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
  Menu,
  MenuItem,
} from '@mui/material'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import RepeatIcon from '@mui/icons-material/Repeat'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import { useSession } from '@/components/providers/SessionProvider'
import RelativeTime from '@/components/utils/RelativeTime'
import ContentParser from '@/components/utils/ContentParser'
import { PostWithAuthor } from '@/types'
import { usePusher } from '@/hooks/usePusher'

interface PostCardProps {
  post: PostWithAuthor
  onLike?: () => void
  onComment?: () => void
  onRepost?: () => void
  onPost?: () => void
}

export default function PostCard({ post, onLike, onComment, onRepost, onPost }: PostCardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [likeCount, setLikeCount] = useState((post as any).likeCount || post._count?.likes || 0)
  const [isLiked, setIsLiked] = useState((post as any).isLiked || false)
  const [commentCount, setCommentCount] = useState((post as any).commentCount || post._count?.comments || 0)
  const [repostCount, setRepostCount] = useState((post as any).repostCount || post._count?.reposts || 0)
  const [isReposted, setIsReposted] = useState(post.isReposted || false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const isOwnPost = session?.user?.id === post.authorId

  // Subscribe to Pusher updates
  usePusher('public-posts', 'post:liked', (data: any) => {
    if (data.postId === post.id) {
      setLikeCount(data.likeCount)
      setIsLiked(data.action === 'liked')
    }
  })

  usePusher('public-posts', 'post:commented', (data: any) => {
    if (data.postId === post.id) {
      setCommentCount((prev: number) => prev + 1)
    }
  })

  usePusher('public-posts', 'post:created', () => {
    // Refresh posts when new post is created
    if (onPost) {
      onPost()
    }
  })

  usePusher('public-posts', 'post:updated', (data: any) => {
    if (data.postId === post.id && data.updatedFields) {
      setEditContent(data.updatedFields.content)
      if (onPost) {
        onPost()
      }
    }
  })

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      // Use authenticated fetch if in localStorage mode
      const { shouldUseLocalStorage, getLocalSession } = await import('@/lib/local-session-storage')
      let headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (shouldUseLocalStorage()) {
        const localSession = getLocalSession()
        if (localSession) {
          headers = {
            ...headers,
            'X-User-Id': localSession.id,
            'X-User-UserId': localSession.userId,
          }
        }
      }

      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.action === 'liked')
        setLikeCount(data.likeCount)
        onLike?.()
      }
    } catch (error) {
      console.error('Like error:', error)
    }
  }

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/posts/${post.id}`)
    onComment?.()
  }

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      // Use authenticated fetch if in localStorage mode
      const { shouldUseLocalStorage, getLocalSession } = await import('@/lib/local-session-storage')
      let headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (shouldUseLocalStorage()) {
        const localSession = getLocalSession()
        if (localSession) {
          headers = {
            ...headers,
            'X-User-Id': localSession.id,
            'X-User-UserId': localSession.userId,
          }
        }
      }

      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setRepostCount(data.repostCount)
        setIsReposted(data.action === 'reposted')
        onRepost?.()
        if (onPost) {
          onPost()
        }
      }
    } catch (error) {
      console.error('Repost error:', error)
    }
  }

  const handleEdit = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (response.ok) {
        setEditMode(false)
        if (onPost) {
          onPost()
        }
      }
    } catch (error) {
      console.error('Edit error:', error)
    }
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!confirm('確定要刪除此文章嗎？')) return
    
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

      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        if (onPost) {
          onPost()
        } else {
          // If no onPost callback, redirect to home
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
    setMenuAnchor(null)
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
  }

  return (
    <Card
      sx={{
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: 0,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        cursor: 'pointer',
      }}
      onClick={() => router.push(`/posts/${post.id}`)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Avatar
            src={post.author.avatarUrl || undefined}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/${post.author.userId}`)
            }}
            sx={{ cursor: 'pointer' }}
          >
            {post.author.name[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="subtitle2"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/${post.author.userId}`)
                  }}
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {post.author.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{post.author.userId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ·
                </Typography>
                <RelativeTime date={post.createdAt} />
              </Box>
              {isOwnPost && !(post as any).isRepost && (
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{ ml: 'auto' }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            {editMode ? (
              <Box onClick={(e) => e.stopPropagation()}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button size="small" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleEdit}>
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <ContentParser content={post.content} />
                {post.imageUrl && (
                  <Box
                    sx={{
                      mt: 2,
                      borderRadius: 2,
                      overflow: 'hidden',
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      style={{
                        width: '100%',
                        maxHeight: 500,
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </Box>
                )}
              </>
            )}
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem onClick={handleDelete}>
                <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                Delete
              </MenuItem>
            </Menu>
            <Box
              sx={{ display: 'flex', gap: 4, mt: 2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton size="small" onClick={handleComment}>
                <ChatBubbleOutlineIcon fontSize="small" />
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {commentCount}
                </Typography>
              </IconButton>
              <IconButton 
                size="small" 
                onClick={handleRepost}
                color={isReposted ? 'primary' : 'default'}
              >
                <RepeatIcon fontSize="small" />
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {repostCount}
                </Typography>
              </IconButton>
              <IconButton size="small" onClick={handleLike} color={isLiked ? 'error' : 'default'}>
                {isLiked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {likeCount}
                </Typography>
              </IconButton>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}



