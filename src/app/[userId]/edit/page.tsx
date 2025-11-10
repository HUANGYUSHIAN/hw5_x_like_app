'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Container,
  Paper,
  Avatar,
  Divider,
  Chip,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ImageUploader from '@/components/profile/ImageUploader'

interface UserProfileData {
  id: string
  userId: string
  name: string
  email?: string | null
  bio?: string | null
  avatarUrl?: string | null
  backgroundUrl?: string | null
}

export default function EditProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const currentUserId = session?.user?.userId
  const targetUserId = params.userId as string

  const [user, setUser] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [userIdError, setUserIdError] = useState<string | null>(null)
  const [needsUserIdSetup, setNeedsUserIdSetup] = useState(false)
  const [checkingUserId, setCheckingUserId] = useState(false)
  const [userIdAvailable, setUserIdAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user?.id) {
      router.push('/auth/signin')
      return
    }

    const fetchUserProfile = async () => {
      try {
        // 优先使用 session 中的 userId 来获取数据，因为 userId 可能刚被修改
        // 如果 targetUserId 与 session.user.userId 不匹配，可能是：
        // 1. 用户正在修改 ID（targetUserId 是旧的，session.user.userId 是新的）
        // 2. URL 中的 userId 是新的，但 session 还没更新
        // 3. URL 中的 userId 是旧的，但用户已经修改了 ID
        
        // 首先尝试使用 targetUserId 获取数据
        let response = await fetch(`/api/users/${targetUserId}`)
        
        // 如果 404 且 targetUserId 与 session.user.userId 不匹配，尝试使用 session.user.userId
        if (!response.ok && response.status === 404 && session.user.userId && targetUserId !== session.user.userId) {
          console.log('[Edit Profile] targetUserId not found, trying session.user.userId:', {
            targetUserId,
            sessionUserId: session.user.userId,
          })
          response = await fetch(`/api/users/${session.user.userId}`)
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found')
          } else {
            throw new Error('Failed to fetch user profile')
          }
          setLoading(false)
          return
        }
        const data: UserProfileData = await response.json()
        
        // Verify that this is the current user's profile
        // Check by comparing user id (MongoDB ObjectID) instead of userId
        // This works even if userId is temporary or being changed
        if (data.id !== session.user.id) {
          // Clear session and redirect to signin
          try {
            // Clear NextAuth session
            const { signOut } = await import('next-auth/react')
            await signOut({ callbackUrl: '/auth/signin', redirect: false })
            // Also clear test-auth-token if exists
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            })
          } catch (error) {
            console.error('Error clearing session:', error)
          }
          // Force redirect to signin page
          window.location.href = '/auth/signin'
          return
        }
        
        // 如果获取到的 userId 与 targetUserId 不匹配，说明用户已经修改了 ID
        // 应该重定向到新的 edit 页面
        if (data.userId !== targetUserId) {
          console.log('[Edit Profile] User ID mismatch, redirecting to new edit page:', {
            targetUserId,
            actualUserId: data.userId,
          })
          router.replace(`/${data.userId}/edit`)
          return
        }
        
        setUser(data)
        setUserId(data.userId || '')
        setName(data.name || '')
        setEmail(data.email || '')
        setBio(data.bio || '')
        setAvatarUrl(data.avatarUrl || '')
        setBackgroundUrl(data.backgroundUrl || '')
        
        // Check if userId needs setup (temporary ID from OAuth)
        // 临时 ID 是 20 个字符的随机字符串（数字+英文字母）
        // 我们通过 session.needsUserIdSetup 来判断，而不是检查 userID 格式
        // 但为了兼容，如果 userID 以 temp_ 开头，也标记为需要设置
        const isTempUserId = data.userId && (data.userId.startsWith('temp_') || data.userId.length === 20)
        setNeedsUserIdSetup(isTempUserId || false)
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [session, status, targetUserId, router])

  const handleUserIdChange = (value: string) => {
    setUserId(value)
    setUserIdError(null)
    setUserIdAvailable(null) // Reset availability status when user types
    
    // Validate userId format
    if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
      setUserIdError('User ID can only contain letters, numbers, and underscores')
    } else if (value.length > 50) {
      setUserIdError('User ID must be 50 characters or less')
    } else {
      setUserIdError(null)
    }
  }

  const handleCheckUserId = async () => {
    if (!userId.trim()) {
      setUserIdError('Please enter a User ID')
      return
    }

    // Validate format first
    const isTempUserId = targetUserId.startsWith('temp_')
    if (isTempUserId) {
      if (userId.length > 20) {
        setUserIdError('User ID must be 20 characters or less')
        return
      }
      if (!/^[a-z0-9]+$/.test(userId)) {
        setUserIdError('User ID can only contain lowercase letters (a-z) and numbers (0-9)')
        return
      }
    } else {
      if (!/^[a-zA-Z0-9_]+$/.test(userId)) {
        setUserIdError('User ID can only contain letters, numbers, and underscores')
        return
      }
    }

    // Don't check if userId hasn't changed
    if (userId === targetUserId) {
      setUserIdAvailable(true)
      return
    }

    setCheckingUserId(true)
    setUserIdError(null)
    
    try {
      const response = await fetch('/api/users/check-userid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.available) {
          setUserIdAvailable(true)
          setUserIdError(null)
        } else {
          setUserIdAvailable(false)
          setUserIdError(data.message || 'User ID is already taken')
        }
      } else {
        setUserIdAvailable(false)
        setUserIdError(data.error || 'Failed to check User ID')
      }
    } catch (error) {
      console.error('Check userId error:', error)
      setUserIdAvailable(false)
      setUserIdError('Failed to check User ID. Please try again.')
    } finally {
      setCheckingUserId(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setUserIdError(null)
    setSaving(true)
    
    try {
      // Validate userId if changed or if it's a temporary userId
      const isTempUserId = targetUserId.startsWith('temp_')
      if (userId !== targetUserId || isTempUserId) {
        if (!userId.trim()) {
          setUserIdError('User ID is required')
          setSaving(false)
          return
        }
        // For new userId setup, use stricter validation (lowercase letters and numbers only, max 20 chars)
        if (isTempUserId) {
          if (userId.length > 20) {
            setUserIdError('User ID must be 20 characters or less')
            setSaving(false)
            return
          }
          if (!/^[a-z0-9]+$/.test(userId)) {
            setUserIdError('User ID can only contain lowercase letters (a-z) and numbers (0-9)')
            setSaving(false)
            return
          }
        } else {
          // For existing userId changes, use original validation
          if (!/^[a-zA-Z0-9_]+$/.test(userId)) {
            setUserIdError('User ID can only contain letters, numbers, and underscores')
            setSaving(false)
            return
          }
        }
        
        // Check if userId is available (if it changed)
        if (userId !== targetUserId) {
          // If user hasn't checked or check failed, verify now
          if (userIdAvailable === null || userIdAvailable === false) {
            try {
              const checkResponse = await fetch('/api/users/check-userid', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
              })
              
              const checkData = await checkResponse.json()
              
              if (!checkResponse.ok || !checkData.available) {
                setUserIdError(checkData.message || 'User ID is already taken. Please choose a different one.')
                setSaving(false)
                return
              }
            } catch (error) {
              console.error('Check userId error:', error)
              setUserIdError('Failed to verify User ID. Please try again.')
              setSaving(false)
              return
            }
          }
        }
      }

      const updateData: any = {
        name,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        backgroundUrl: backgroundUrl || null,
      }

      // Include userId if it changed or if it's a temporary userId
      // (isTempUserId is already declared above)
      if (userId !== targetUserId || isTempUserId) {
        updateData.userId = userId
      }

      // email 不允许修改（OAuth 绑定）
      // 移除 email 更新逻辑

      const response = await fetch(`/api/users/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'User ID already taken') {
          setUserIdError('This user ID is already taken')
        } else {
          throw new Error(errorData.message || errorData.error || 'Failed to update profile.')
        }
        setSaving(false)
        return
      }

      const updatedData = await response.json()
      setSuccess(needsUserIdSetup ? '註冊完成！' : 'Profile updated successfully!')
      
      // If it was a temporary userId, clear the needsUserIdSetup flag
      if (needsUserIdSetup) {
        setNeedsUserIdSetup(false)
      }
      
      // If userId changed, redirect to new edit page URL
      const redirectUserId = updatedData.userId || userId || targetUserId
      
      // If userId changed, redirect to new edit page (not profile page)
      // This ensures the user can continue editing if needed
      if (redirectUserId !== targetUserId) {
        // Wait a bit for session to update, then redirect to new edit page
        setTimeout(() => {
          // Force a hard reload to ensure session is updated
          window.location.href = `/${redirectUserId}/edit`
        }, 1500)
      } else {
        // If userId didn't change, redirect to profile page
        setTimeout(() => {
          router.push(`/${redirectUserId}`)
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="70vh">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error && !user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    )
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">User data not found.</Alert>
        <Button variant="contained" onClick={() => router.back()} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              variant="outlined"
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              {needsUserIdSetup ? '完成註冊' : 'Edit Profile'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ minWidth: 120 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>

        {needsUserIdSetup && (
          <Alert severity="info" sx={{ mb: 2 }}>
            請設定您的 User ID。此 ID 將用於識別您的帳號，之後可以使用此 ID 登入。
            <br />
            <Typography component="span" variant="caption">
              長度 20 字內，僅能使用小寫字母 (a-z) 和數字 (0-9)
            </Typography>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* User ID */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="User ID (@username)"
              fullWidth
              margin="normal"
              value={userId}
              onChange={(e) => {
                const value = needsUserIdSetup ? e.target.value.toLowerCase() : e.target.value
                handleUserIdChange(value)
              }}
              required={needsUserIdSetup || userId !== targetUserId}
              error={!!userIdError}
              helperText={
                userIdError || 
                (userIdAvailable === true ? 'User ID is available ✓' :
                 userIdAvailable === false ? 'User ID is already taken' :
                 needsUserIdSetup 
                  ? '長度 20 字內，僅能使用小寫字母 (a-z) 和數字 (0-9)' 
                  : 'Your unique username (letters, numbers, and underscores only)')
              }
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>@</Typography>,
              }}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="outlined"
              onClick={handleCheckUserId}
              disabled={checkingUserId || !userId.trim() || userId === targetUserId}
              sx={{ mt: 2, minWidth: 100 }}
            >
              {checkingUserId ? <CircularProgress size={20} /> : 'Check'}
            </Button>
          </Box>
          {userId !== targetUserId && (
            <Chip
              label="Changing user ID will update your profile URL"
              color="warning"
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Name */}
        <TextField
          label="Display Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          helperText="Your display name (shown to other users)"
        />

        {/* Email - 只读（OAuth 绑定，不允许修改） */}
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          type="email"
          value={email}
          disabled
          helperText="Email address (bound to OAuth account, cannot be changed)"
        />

        {/* Bio */}
        <TextField
          label="Bio"
          fullWidth
          margin="normal"
          multiline
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          inputProps={{ maxLength: 500 }}
          helperText={`${bio.length}/500 characters`}
        />

        <Divider sx={{ my: 3 }} />

        {/* Avatar Image Uploader */}
        <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
          Profile Picture
        </Typography>
        <ImageUploader
          label="Avatar Image URL"
          value={avatarUrl}
          onChange={setAvatarUrl}
          previewSize={{ width: 200, height: 200 }}
        />

        {/* Background Image Uploader */}
        <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
          Background Image
        </Typography>
        <ImageUploader
          label="Background Image URL"
          value={backgroundUrl}
          onChange={setBackgroundUrl}
          previewSize={{ width: 600, height: 200 }}
          aspectRatio={3}
        />

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => router.back()}
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

