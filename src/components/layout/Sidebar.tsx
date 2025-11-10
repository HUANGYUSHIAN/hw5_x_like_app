'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { useThemeMode } from '@/components/providers/ThemeProvider'
import { signOut } from 'next-auth/react'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Button,
} from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import PersonIcon from '@mui/icons-material/Person'
import EditIcon from '@mui/icons-material/Edit'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import ExploreIcon from '@mui/icons-material/Explore'
import CreateIcon from '@mui/icons-material/Create'
import NotificationsIcon from '@mui/icons-material/Notifications'
import ChatIcon from '@mui/icons-material/Chat'

const drawerWidth = 280
const collapsedWidth = 80

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const { mode } = useThemeMode()

  // Fetch unread notifications count
  useEffect(() => {
    if (!session?.user?.id) {
      setUnreadCount(0)
      return
    }

    const fetchUnreadCount = async () => {
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

        const response = await fetch('/api/notifications/unread', {
          headers,
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.count || 0)
        }
      } catch (error) {
        console.error('Fetch unread count error:', error)
      }
    }

    fetchUnreadCount()

    // Set up Pusher subscription for real-time updates
    if (typeof window !== 'undefined' && session?.user?.id) {
      try {
        const { getPusherClient } = require('@/lib/pusher')
        const pusher = getPusherClient()
        if (pusher) {
          const channelName = `private-user-${session.user.id}`
          const channel = pusher.subscribe(channelName)

          channel.bind('notification:created', () => {
            fetchUnreadCount()
          })

          return () => {
            channel.unbind('notification:created')
            pusher.unsubscribe(channelName)
          }
        }
      } catch (error) {
        console.warn('[Pusher] Error setting up notification subscription:', error)
      }
    }
  }, [session])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleEditProfile = () => {
    handleMenuClose()
    if (session?.user?.userId) {
      router.push(`/${session.user.userId}/edit`)
    }
  }

  const handleLogout = async () => {
    try {
      handleMenuClose()
      
      // First, call logout API to clear test-auth-token cookie (for test login)
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (error) {
        console.warn('Logout API error:', error)
      }
      
      // Then, try NextAuth signOut (for OAuth login)
      try {
        await signOut({ callbackUrl: '/auth/signin', redirect: false })
      } catch (error) {
        console.warn('NextAuth signOut error:', error)
      }
      
      // Force a hard reload to ensure all cookies are cleared and session is reset
      window.location.href = '/auth/signin'
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: force redirect to signin page
      window.location.href = '/auth/signin'
    }
  }

  const menuItems = [
    { icon: <HomeIcon />, text: 'Home', path: '/' },
    { 
      icon: (
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      ), 
      text: 'Notifications', 
      path: '/notifications' 
    },
    { icon: <ExploreIcon />, text: 'Explore', path: '/explore' },
    { icon: <ChatIcon />, text: 'Chat', path: '/chat' },
    { icon: <PersonIcon />, text: 'Profile', path: session?.user?.userId ? `/${session.user.userId}` : '/profile' },
  ]

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: { xs: collapsedWidth, sm: collapsed ? collapsedWidth : drawerWidth },
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: { xs: collapsedWidth, sm: collapsed ? collapsedWidth : drawerWidth },
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          transition: 'width 0.3s ease',
          position: 'fixed', // 固定在视口
          height: '100vh', // 视口高度
          overflowY: 'auto', // 纵向滚动
          overflowX: 'hidden',
          top: 0,
          left: 0,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && <Typography variant="h6">X-like</Typography>}
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
            {collapsed ? <MenuIcon /> : <CloseIcon />}
          </IconButton>
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => router.push(item.path)}
                sx={{
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 0 : 3,
                    justifyContent: 'center',
                  }}
                >
                  {item.text === 'Notifications' ? (
                    <Badge badgeContent={unreadCount} color="error" max={99}>
                      <NotificationsIcon />
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.text} />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Post button and user profile - 固定在视口底部 */}
        <Box sx={{ mt: 'auto', flexShrink: 0 }}>
          {/* Post button at bottom */}
          {session && (
            <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={!collapsed && <CreateIcon />}
                onClick={() => router.push('/compose/post')}
                sx={{
                  bgcolor: mode === 'light' ? '#000000' : '#ffffff',
                  color: mode === 'light' ? '#ffffff' : '#000000',
                  '&:hover': {
                    bgcolor: mode === 'light' ? '#333333' : '#e0e0e0',
                  },
                  textTransform: 'none',
                  fontWeight: 'bold',
                  py: 1.5,
                }}
              >
                {collapsed ? <CreateIcon /> : 'Post'}
              </Button>
            </Box>
          )}

          {session?.user && (
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
              }}
              onClick={handleMenuOpen}
            >
              <Avatar src={session.user.image || undefined} sx={{ width: 40, height: 40 }}>
                {session.user.name?.[0]}
              </Avatar>
              {!collapsed && (
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {session.user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    @{session.user.userId || 'user'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEditProfile}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Drawer>
  )
}



