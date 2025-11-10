'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Typography,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonIcon from '@mui/icons-material/Person'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useSession } from '@/components/providers/SessionProvider'

interface SearchUser {
  id: string
  userId: string
  name: string
  bio?: string | null
  avatarUrl?: string | null
  isFollowing?: boolean
  isFollowedBy?: boolean
  _count?: {
    posts: number
    followers: number
    following: number
  }
}

export default function ExplorePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (query.trim().length === 0) {
      setResults([])
      return
    }

    debounceTimer.current = setTimeout(async () => {
      await performSearch(query.trim())
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
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

      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=20`, {
        headers,
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.items || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
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

      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })

      if (response.ok) {
        // Update the follow status in results
        setResults((prev) =>
          prev.map((user) =>
            user.userId === userId
              ? { ...user, isFollowing: !isFollowing }
              : user
          )
        )
      }
    } catch (error) {
      console.error('Follow error:', error)
    }
  }

  const handleUserClick = (userId: string) => {
    router.push(`/${userId}`)
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
        <TextField
          fullWidth
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {query.trim().length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            People
          </Typography>
          {results.length > 0 ? (
            <List>
              {results.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <Paper
                    sx={{
                      width: '100%',
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemButton onClick={() => handleUserClick(user.userId)}>
                      <ListItemAvatar>
                        <Avatar src={user.avatarUrl || undefined}>
                          {user.name[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {user.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              @{user.userId}
                            </Typography>
                            {user.bio && (
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {user.bio}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      {session?.user?.userId !== user.userId && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFollow(user.userId, user.isFollowing || false)
                          }}
                          color={user.isFollowing ? 'default' : 'primary'}
                          sx={{ ml: 1 }}
                        >
                          {user.isFollowing ? (
                            <PersonIcon />
                          ) : (
                            <PersonAddIcon />
                          )}
                        </IconButton>
                      )}
                    </ListItemButton>
                  </Paper>
                </ListItem>
              ))}
            </List>
          ) : !loading ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No users found
            </Typography>
          ) : null}
        </Box>
      )}
    </Box>
  )
}

