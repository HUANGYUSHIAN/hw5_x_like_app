'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Box, CircularProgress, TextField, Button, Avatar, IconButton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PostCard from '@/components/post/PostCard'
import CommentCard from '@/components/post/CommentCard'
import { PostWithAuthor, CommentWithAuthor } from '@/types'
import { useSession } from '@/components/providers/SessionProvider'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.postId as string
  const { data: session } = useSession()
  const [post, setPost] = useState<PostWithAuthor | null>(null)
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [commentContent, setCommentContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPost()
    fetchComments()
  }, [postId])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`)
      if (response.ok) {
        const data = await response.json()
        setPost(data)
      }
    } catch (error) {
      console.error('Fetch post error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.items)
      }
    } catch (error) {
      console.error('Fetch comments error:', error)
    }
  }

  const handleComment = async () => {
    if (!commentContent.trim()) return

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      })
      if (response.ok) {
        setCommentContent('')
        fetchComments()
        fetchPost() // Update comment count
      }
    } catch (error) {
      console.error('Comment error:', error)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!post) {
    return <Box sx={{ p: 4 }}>Post not found</Box>
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
          Post
        </Typography>
      </Box>
      <PostCard post={post} onPost={() => { fetchPost(); fetchComments(); }} />
      {session && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Avatar src={session.user?.image || undefined}>
              {session.user?.name?.[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Post your reply"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                variant="outlined"
                size="small"
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleComment}
                  disabled={!commentContent.trim()}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
      <Box>
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            onComment={() => fetchComments()}
          />
        ))}
      </Box>
    </Box>
  )
}





