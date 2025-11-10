'use client'

import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  Divider,
  Alert,
  TextField,
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useToast } from '@/components/providers/ToastProvider'

export default function SignInPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testUserId, setTestUserId] = useState('')
  const [testName, setTestName] = useState('')
  const [availableProviders, setAvailableProviders] = useState<{
    github: boolean
    google: boolean
  }>({ github: false, google: false })

  // 检查 URL 参数中的错误信息（NextAuth 错误）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      let errorMessage = '登入失敗'
      switch (errorParam) {
        case 'Configuration':
          errorMessage = 'OAuth 配置錯誤，請聯繫管理員'
          break
        case 'AccessDenied':
          errorMessage = '登入被拒絕，請確保已授權 email 權限'
          break
        case 'Verification':
          errorMessage = '驗證失敗，請重試'
          break
        case 'OAuthSignin':
          errorMessage = 'OAuth 登入失敗，請重試'
          break
        case 'OAuthCallback':
          errorMessage = 'OAuth 回調失敗，請重試'
          break
        case 'OAuthCreateAccount':
          errorMessage = '無法創建帳戶，請重試'
          break
        case 'EmailCreateAccount':
          errorMessage = '無法創建帳戶，請重試'
          break
        case 'Callback':
          errorMessage = '回調錯誤，請重試'
          break
        case 'OAuthAccountNotLinked':
          errorMessage = '此 OAuth 帳戶未與現有帳戶關聯'
          break
        case 'EmailSignin':
          errorMessage = 'Email 登入失敗，請重試'
          break
        case 'CredentialsSignin':
          errorMessage = '憑證登入失敗，請檢查您的帳號密碼'
          break
        case 'SessionRequired':
          errorMessage = '需要登入才能訪問此頁面'
          break
        default:
          errorMessage = `登入失敗：${errorParam}`
      }
      setError(errorMessage)
      showToast(errorMessage, 'error')
      // 清除 URL 中的 error 参数
      router.replace('/auth/signin')
    }
  }, [router, showToast])

  // 获取可用的 OAuth providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/auth/providers')
        if (response.ok) {
          const providers = await response.json()
          setAvailableProviders({
            github: !!providers.github,
            google: !!providers.google,
          })
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error)
      }
    }
    fetchProviders()
  }, [])

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(provider)
    setError(null)
    try {
      // OAuth 登录流程：
      // 1. 用户点击按钮 → 跳转到 OAuth 提供商（Google/GitHub）选择账号
      // 2. OAuth 回调 → NextAuth 处理，检查用户是否已存在
      // 3. 如果新用户 → 自动生成临时 userID 并创建账户，重定向到 /{userId}/edit 设置正式 userID
      // 4. 如果已注册用户 → 直接登录，跳转到首页
      await signIn(provider, { 
        callbackUrl: '/', // 回调 URL，但 middleware 会根据 needsUserIdSetup 决定最终跳转
        redirect: true // 使用 redirect: true 让 NextAuth 处理重定向到 OAuth 提供商
      })
      
      // 如果 redirect: true，这个代码不会执行（因为会立即跳转）
    } catch (error) {
      console.error('OAuth sign in error:', error)
      setError('登入失敗，請重試')
      showToast('登入失敗，請重試', 'error')
      setLoading(null)
    }
  }

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedUserId = testUserId.trim()
    const trimmedName = testName.trim()
    
    if (!trimmedUserId || !trimmedName) {
      setError('請輸入 User ID 和 Name')
      showToast('請輸入 User ID 和 Name', 'warning')
      return
    }

    setLoading('test')
    setError(null)
    try {
      const response = await fetch('/api/auth/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ userId: trimmedUserId, name: trimmedName }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showToast(`登入成功！歡迎 ${data.user.name}`, 'success')
        // Clear loading state immediately
        setLoading(null)
        
        // Test login uses test-auth-token cookie (backdoor mechanism)
        // Force a full page reload to ensure session is picked up
        setTimeout(() => {
          window.location.href = '/'
        }, 500) // Short delay is enough for cookie to be set
      } else {
        const errorMsg = data.error || '測試登入失敗'
        setError(errorMsg)
        showToast(errorMsg, 'error')
        setLoading(null)
      }
    } catch (error: any) {
      console.error('Test login error:', error)
      const errorMsg = '測試登入時發生錯誤，請檢查網路連線'
      setError(errorMsg)
      showToast(errorMsg, 'error')
      setLoading(null)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Paper sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" gutterBottom align="center">
            登入
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            選擇 OAuth 提供者（Google 或 GitHub）進行登入
            <br />
            <Typography component="span" variant="caption" color="text.secondary">
              新用戶將自動創建帳戶並可設置 User ID
            </Typography>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* OAuth Buttons - 优先显示 GitHub，其次 Google */}
          {!availableProviders.github && !availableProviders.google && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              未配置任何 OAuth provider。请至少配置以下之一：
              <br />• GitHub: GITHUB_ID 和 GITHUB_SECRET
              <br />• Google: GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {/* 优先显示 GitHub */}
            {availableProviders.github && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<GitHubIcon />}
                onClick={() => handleOAuthSignIn('github')}
                disabled={loading !== null}
                sx={{ py: 1.5 }}
              >
                {loading === 'github' ? '登入中...' : '使用 GitHub 登入'}
              </Button>
            )}
            
            {/* 其次显示 Google */}
            {availableProviders.google && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<GoogleIcon />}
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading !== null}
                sx={{ py: 1.5 }}
              >
                {loading === 'google' ? '登入中...' : '使用 Google 登入'}
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              測試登入
            </Typography>
          </Divider>

          {/* Test Login Form */}
          <form onSubmit={handleTestLogin}>
            <TextField
              fullWidth
              label="User ID"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              margin="normal"
              disabled={loading !== null}
              placeholder="例如: userA"
            />
            <TextField
              fullWidth
              label="Name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              margin="normal"
              disabled={loading !== null}
              placeholder="例如: User A"
            />
            <Button
              type="submit"
              fullWidth
              variant="outlined"
              disabled={loading !== null}
              sx={{ mt: 2, py: 1.5 }}
            >
              {loading === 'test' ? '登入中...' : '測試登入'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

