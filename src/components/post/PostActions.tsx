'use client'

import { IconButton, Typography, Box } from '@mui/material'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import RepeatIcon from '@mui/icons-material/Repeat'

interface PostActionsProps {
  likeCount: number
  commentCount: number
  repostCount: number
  isLiked: boolean
  onLike: () => void
  onComment: () => void
  onRepost: () => void
}

export default function PostActions({
  likeCount,
  commentCount,
  repostCount,
  isLiked,
  onLike,
  onComment,
  onRepost,
}: PostActionsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 4 }}>
      <IconButton size="small" onClick={onComment}>
        <ChatBubbleOutlineIcon fontSize="small" />
        <Typography variant="caption" sx={{ ml: 0.5 }}>
          {commentCount}
        </Typography>
      </IconButton>
      <IconButton size="small" onClick={onRepost}>
        <RepeatIcon fontSize="small" />
        <Typography variant="caption" sx={{ ml: 0.5 }}>
          {repostCount}
        </Typography>
      </IconButton>
      <IconButton size="small" onClick={onLike} color={isLiked ? 'error' : 'default'}>
        {isLiked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        <Typography variant="caption" sx={{ ml: 0.5 }}>
          {likeCount}
        </Typography>
      </IconButton>
    </Box>
  )
}











