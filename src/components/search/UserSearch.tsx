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
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonIcon from '@mui/icons-material/Person'

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

interface UserSearchProps {
  onUserSelect?: (userId: string) => void
  placeholder?: string
}

export default function UserSearch({ 
  onUserSelect,
  placeholder = 'Search users...' 
}: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Close results when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (query.trim().length === 0) {
      setResults([])
      setShowResults(false)
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
    if (searchQuery.length === 0) return

    setLoading(true)
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
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setResults(data.items || [])
        setShowResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (userId: string) => {
    setShowResults(false)
    setQuery('')
    // Just navigate to the user's profile page
    // This does NOT change the logged-in user - it only views their profile
    if (onUserSelect) {
      onUserSelect(userId)
    } else {
      router.push(`/${userId}`)
    }
  }

  const handleFollow = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation()
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
        // Refresh search results to update follow status
        await performSearch(query.trim())
      }
    } catch (error) {
      console.error('Follow error:', error)
    }
  }

  return (
    <Box ref={searchRef} sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length > 0 && setShowResults(true)}
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
        sx={{ mb: 1 }}
      />

      {showResults && results.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 400,
            overflow: 'auto',
            mt: 0.5,
            boxShadow: 3,
          }}
        >
          <List dense>
            {results.map((user) => (
              <ListItem
                key={user.id}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user.isFollowing ? (
                      <Typography variant="caption" color="text.secondary">
                        Following
                      </Typography>
                    ) : (
                      <PersonAddIcon
                        sx={{ cursor: 'pointer', fontSize: 20 }}
                        onClick={(e) => handleFollow(e, user.userId)}
                      />
                    )}
                  </Box>
                }
              >
                <ListItemButton onClick={() => handleUserClick(user.userId)}>
                  <ListItemAvatar>
                    <Avatar src={user.avatarUrl || undefined}>
                      {user.name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{user.userId}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      user.bio && (
                        <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                          {user.bio}
                        </Typography>
                      )
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {showResults && query.trim().length > 0 && !loading && results.length === 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            p: 2,
            mt: 0.5,
            boxShadow: 3,
          }}
        >
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No users found
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

