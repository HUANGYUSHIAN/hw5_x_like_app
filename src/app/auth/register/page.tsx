'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useToast } from '@/components/providers/ToastProvider'

export default function RegisterPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { showToast } = useToast()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingUserId, setCheckingUserId] = useState(false)
  const [userIdAvailable, setUserIdAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user needs registration
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session && !session.needsRegistration) {
      // User already registered, redirect to home
      router.push('/')
      return
    }

    if (session && !session.needsRegistration && !session.provider) {
      // User doesn't need registration
      router.push('/')
    }
  }, [session, status, router])

  const validateUserId = (id: string): string | null => {
    if (!id || id.trim().length === 0) {
      return 'User ID 不能為空'
    }

    if (id.length > 20) {
      return 'User ID 長度不能超過 20 個字元'
    }

    // Only lowercase letters and numbers
    if (!/^[a-z0-9]+$/.test(id)) {
      return 'User ID 只能包含小寫字母 (a-z) 和數字 (0-9)，不能使用特殊符號'
    }

    return null
  }

  const handleCheckUserId = async () => {
    const trimmedUserId = userId.trim()
    const validationError = validateUserId(trimmedUserId)

    if (validationError) {
      setError(validationError)
      setUserIdAvailable(false)
      return
    }

    setCheckingUserId(true)
    setError(null)
    
    try {
      const response = await fetch('/api/users/check-userid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: trimmedUserId }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.available) {
          setUserIdAvailable(true)
          setError(null)
        } else {
          setUserIdAvailable(false)
          setError(data.message || 'User ID is already taken')
        }
      } else {
        setUserIdAvailable(false)
        setError(data.error || 'Failed to check User ID')
      }
    } catch (error) {
      console.error('Check userId error:', error)
      setUserIdAvailable(false)
      setError('Failed to check User ID. Please try again.')
    } finally {
      setCheckingUserId(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedUserId = userId.trim()
    const validationError = validateUserId(trimmedUserId)

    if (validationError) {
      setError(validationError)
      return
    }

    // Check if userId is available before registering
    if (userIdAvailable === null || userIdAvailable === false) {
      // If not checked or check failed, verify now
      try {
        const checkResponse = await fetch('/api/users/check-userid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: trimmedUserId }),
        })
        
        const checkData = await checkResponse.json()
        
        if (!checkResponse.ok || !checkData.available) {
          setError(checkData.message || 'User ID is already taken. Please choose a different one.')
          setUserIdAvailable(false)
          return
        }
        setUserIdAvailable(true)
      } catch (error) {
        console.error('Check userId error:', error)
        setError('Failed to verify User ID. Please try again.')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: trimmedUserId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Registration successful
        const successMsg = data.message || '註冊成功！歡迎加入！'
        showToast(successMsg, 'success')
        console.log('[Register] 註冊成功，用戶:', data.user)
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      } else {
        const errorMsg = data.error || '註冊失敗'
        setError(errorMsg)
        showToast(errorMsg, 'error')
        console.error('[Register] 註冊失敗:', errorMsg)
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('註冊時發生錯誤，請檢查網路連線')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Typography>載入中...</Typography>
        </Box>
      </Container>
    )
  }

  if (!session || !session.needsRegistration) {
    return null
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Paper sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" gutterBottom>
            完成註冊
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            您已通過 OAuth 認證，請選擇一個 User ID 來完成註冊。
            <br />
            {session?.provider && (
              <Typography component="span" variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                登入方式: {session.provider === 'github' ? 'GitHub' : session.provider === 'google' ? 'Google' : session.provider}
                {session.user?.email && (
                  <>
                    <br />
                    Email: {session.user.email}
                  </>
                )}
              </Typography>
            )}
            <Typography component="span" variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              此 User ID 將用於識別您的帳號，之後可以使用此 ID 登入。
            </Typography>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleRegister}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="User ID"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value.toLowerCase()) // Convert to lowercase
                  setError(null)
                  setUserIdAvailable(null) // Reset availability status when user types
                }}
                margin="normal"
                required
                disabled={loading}
                error={!!error && (userIdAvailable === false || error.includes('taken'))}
                helperText={
                  error && (userIdAvailable === false || error.includes('taken')) 
                    ? error 
                    : userIdAvailable === true 
                      ? 'User ID is available ✓'
                      : userIdAvailable === false
                        ? 'User ID is already taken'
                        : '長度 20 字內，僅能使用小寫字母 (a-z) 和數字 (0-9)'
                }
                inputProps={{
                  pattern: '[a-z0-9]*',
                  maxLength: 20,
                }}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                onClick={handleCheckUserId}
                disabled={checkingUserId || !userId.trim() || loading}
                sx={{ mt: 2, minWidth: 100 }}
              >
                {checkingUserId ? <CircularProgress size={20} /> : 'Check'}
              </Button>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading ? '註冊中...' : '完成註冊'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

