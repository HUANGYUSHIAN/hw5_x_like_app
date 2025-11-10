'use client'

import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Box,
  IconButton,
} from '@mui/material'
import RepeatIcon from '@mui/icons-material/Repeat'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { useSession } from '@/components/providers/SessionProvider'
import RelativeTime from '@/components/utils/RelativeTime'
import ContentParser from '@/components/utils/ContentParser'
import { PostWithAuthor } from '@/types'

interface RepostCardProps {
  repostedBy: {
    id: string
    userId: string
    name: string
    avatarUrl?: string | null
  }
  post: PostWithAuthor
  onPost?: () => void
}

export default function RepostCard({ repostedBy, post, onPost }: RepostCardProps) {
  const router = useRouter()
  const { data: session } = useSession()

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
        {/* Repost header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pl: 7 }}>
          <RepeatIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography
            variant="caption"
            color="text.secondary"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/${repostedBy.userId}`)
            }}
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            {repostedBy.name} reposted
          </Typography>
        </Box>

        {/* Original post content */}
        <Box sx={{ pl: 7 }}>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

