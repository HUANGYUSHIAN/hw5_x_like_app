'use client'

import { useRouter } from 'next/navigation'
import {
  Box,
  Avatar,
  Typography,
} from '@mui/material'
import RelativeTime from '@/components/utils/RelativeTime'
import ContentParser from '@/components/utils/ContentParser'
import { CommentWithAuthor } from '@/types'

interface CommentCardProps {
  comment: CommentWithAuthor
  onComment?: () => void
}

export default function CommentCard({ comment, onComment }: CommentCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/comments/${comment.id}`)
  }

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        pl: 6,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      onClick={handleClick}
    >
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar
          src={comment.author.avatarUrl || undefined}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/${comment.author.userId}`)
          }}
          sx={{ cursor: 'pointer' }}
        >
          {comment.author.name[0]}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography
              variant="subtitle2"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/${comment.author.userId}`)
              }}
              sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            >
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
          {comment._count?.replies && comment._count.replies > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}




