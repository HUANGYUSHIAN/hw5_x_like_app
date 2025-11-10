'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Box, CircularProgress, TextField, Button, Avatar, IconButton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CommentCard from '@/components/post/CommentCard'
import { CommentWithAuthor } from '@/types'
import { useSession } from '@/components/providers/SessionProvider'
import RelativeTime from '@/components/utils/RelativeTime'
import ContentParser from '@/components/utils/ContentParser'

export default function CommentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const commentId = params.commentId as string
  const { data: session } = useSession()
  const [comment, setComment] = useState<CommentWithAuthor | null>(null)
  const [parentComment, setParentComment] = useState<CommentWithAuthor | null>(null)
  const [replies, setReplies] = useState<CommentWithAuthor[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComment()
    fetchReplies()
  }, [commentId])

  const fetchComment = async () => {
    try {
      const response = await fetch(`/api/comments/${commentId}`)
      if (response.ok) {
        const data = await response.json()
        setComment(data)
        
        // If this comment has a parent, fetch it
        if (data.parentId) {
          const parentResponse = await fetch(`/api/comments/${data.parentId}`)
          if (parentResponse.ok) {
            const parentData = await parentResponse.json()
            setParentComment(parentData)
          }
        }
      }
    } catch (error) {
      console.error('Fetch comment error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async () => {
    try {
      const response = await fetch(`/api/comments/${commentId}/replies`)
      if (response.ok) {
        const data = await response.json()
        setReplies(data.items || [])
      }
    } catch (error) {
      console.error('Fetch replies error:', error)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || !comment) return

    try {
      const response = await fetch(`/api/posts/${comment.postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: replyContent,
          parentId: commentId,
        }),
      })
      if (response.ok) {
        setReplyContent('')
        fetchReplies()
        fetchComment() // Update reply count
      }
    } catch (error) {
      console.error('Reply error:', error)
    }
  }

  const handleBack = () => {
    if (comment?.parentId) {
      router.push(`/comments/${comment.parentId}`)
    } else if (comment?.postId) {
      router.push(`/posts/${comment.postId}`)
    } else {
      router.push('/')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!comment) {
    return <Box sx={{ p: 4 }}>Comment not found</Box>
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
        <IconButton onClick={handleBack} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          Post
        </Typography>
      </Box>

      {/* Show parent comment if exists */}
      {parentComment && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Avatar src={parentComment.author.avatarUrl || undefined}>
              {parentComment.author.name[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {parentComment.author.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{parentComment.author.userId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ·
                </Typography>
                <RelativeTime date={parentComment.createdAt} />
              </Box>
              <ContentParser content={parentComment.content} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Current comment */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Avatar src={comment.author.avatarUrl || undefined}>
            {comment.author.name[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {comment.author.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                @{comment.author.userId}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ·
              </Typography>
              <RelativeTime date={comment.createdAt} />
            </Box>
            <ContentParser content={comment.content} />
          </Box>
        </Box>
      </Box>

      {/* Reply form */}
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
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                variant="outlined"
                size="small"
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Replies */}
      <Box>
        {replies.map((reply) => (
          <CommentCard
            key={reply.id}
            comment={reply}
            onComment={() => fetchReplies()}
          />
        ))}
      </Box>
    </Box>
  )
}




