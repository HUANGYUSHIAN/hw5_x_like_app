'use client'

import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import {
  Box,
  Avatar,
  Typography,
  Button,
  Paper,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { UserWithCounts } from '@/types'

interface ProfileHeaderProps {
  user: UserWithCounts
  isOwnProfile: boolean
  isFollowing?: boolean
  isFollowedBy?: boolean
  onFollow?: () => void
  onEdit?: () => void
}

export default function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing,
  isFollowedBy,
  onFollow,
  onEdit,
}: ProfileHeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleEditProfile = () => {
    if (user.userId) {
      router.push(`/${user.userId}/edit`)
    }
  }

  return (
    <>
      <Paper
        sx={{
          height: 200,
          backgroundImage: user.backgroundUrl
            ? `url(${user.backgroundUrl})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      />
      <Box sx={{ px: 3, pb: 2, position: 'relative' }}>
        <Avatar
          src={user.avatarUrl || undefined}
          sx={{
            width: 120,
            height: 120,
            border: '4px solid white',
            mt: -6,
            mb: 2,
          }}
        >
          {user.name[0]}
        </Avatar>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user.userId}
            </Typography>
            {user.bio && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {user.bio}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              <Typography variant="body2">
                <strong>{user._count?.posts || 0}</strong> Posts
              </Typography>
              <Typography variant="body2">
                <strong>{user._count?.following || 0}</strong> Following
              </Typography>
              <Typography variant="body2">
                <strong>{user._count?.followers || 0}</strong> Followers
              </Typography>
            </Box>
          </Box>
          {isOwnProfile ? (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditProfile}
            >
              Edit Profile
            </Button>
          ) : (
            session && (
              <Button
                variant={isFollowing ? 'outlined' : 'contained'}
                onClick={onFollow}
              >
                {isFollowing 
                  ? 'Following' 
                  : isFollowedBy 
                    ? 'Follow Back' 
                    : 'Follow'}
              </Button>
            )
          )}
        </Box>
      </Box>
    </>
  )
}





