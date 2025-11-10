'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useRouter } from 'next/navigation'
import { usePusher } from '@/hooks/usePusher'
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import MessageContent from '@/components/chat/MessageContent'
import RelativeTime from '@/components/utils/RelativeTime'

interface MutualUser {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  bio: string | null
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  sender: {
    id: string
    userId: string
    name: string
    avatarUrl: string | null
  }
  receiver: {
    id: string
    userId: string
    name: string
    avatarUrl: string | null
  }
}

export default function ChatPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mutualUsers, setMutualUsers] = useState<MutualUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 获取双向 follow 的用户列表
  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    const fetchMutualUsers = async () => {
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

        const response = await fetch('/api/chat/mutual-follows', {
          headers,
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setMutualUsers(data.items || [])
        }
      } catch (error) {
        console.error('Fetch mutual users error:', error)
      }
    }

    fetchMutualUsers()
  }, [session, router])

  // 获取聊天消息
  useEffect(() => {
    if (!selectedUserId || !session?.user?.id) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setLoading(true)
      setError(null)

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

        const response = await fetch(`/api/chat/messages?otherUserId=${selectedUserId}&limit=100`, {
          headers,
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setMessages(data.items || [])
          // 滚动到底部
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load messages')
        }
      } catch (error) {
        console.error('Fetch messages error:', error)
        setError('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [selectedUserId, session])

  // 订阅 Pusher 实时消息
  usePusher(
    session?.user?.id ? `private-user-${session.user.id}` : null,
    'message:received',
    (data: any) => {
      // 只有当消息来自当前选中的用户时才添加到消息列表
      if (data.senderId === selectedUserId) {
        const newMessage: Message = {
          id: data.messageId,
          senderId: data.senderId,
          receiverId: session!.user!.id,
          content: data.content,
          createdAt: data.createdAt,
          sender: {
            id: data.senderId,
            userId: data.senderUserId,
            name: data.senderName,
            avatarUrl: null,
          },
          receiver: {
            id: session!.user!.id,
            userId: session!.user!.userId || '',
            name: session!.user!.name || '',
            avatarUrl: session!.user!.image || null,
          },
        }
        setMessages((prev) => [...prev, newMessage])
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  )

  // 发送消息
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !selectedUserId || sending) {
      return
    }

    setSending(true)
    setError(null)

    try {
      const { shouldUseLocalStorage, getLocalSession } = await import('@/lib/local-session-storage')
      let headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
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

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          receiverId: selectedUserId,
          content: messageContent,
        }),
      })

      if (response.ok) {
        const newMessage = await response.json()
        setMessages((prev) => [...prev, newMessage])
        setMessageContent('')
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Send message error:', error)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // 处理 Enter 键发送（Shift+Enter 换行）
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const selectedUser = mutualUsers.find((u) => u.id === selectedUserId)

  if (!session?.user?.id) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 顶部：用户选择下拉菜单 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <FormControl fullWidth>
          <InputLabel>Select a user to chat</InputLabel>
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            label="Select a user to chat"
          >
            {mutualUsers.length === 0 ? (
              <MenuItem disabled>No mutual follows found</MenuItem>
            ) : (
              mutualUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={user.avatarUrl || undefined} sx={{ width: 24, height: 24 }}>
                      {user.name[0]}
                    </Avatar>
                    <Typography variant="body2">{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{user.userId}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 聊天室 */}
      {selectedUserId ? (
        <>
          {/* 消息列表 */}
          <Box
            ref={messagesContainerRef}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                <Typography variant="body2">No messages yet. Start the conversation!</Typography>
              </Box>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === session.user.id
                return (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: '70%',
                        bgcolor: isOwnMessage ? 'primary.main' : 'action.hover',
                        color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                      }}
                    >
                      <MessageContent content={message.content} />
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          opacity: 0.7,
                          fontSize: '0.7rem',
                        }}
                      >
                        <RelativeTime date={message.createdAt} />
                      </Typography>
                    </Paper>
                  </Box>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* 输入框和发送按钮 */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type a message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sending}
              startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            >
              Send
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Select a user to start chatting
          </Typography>
        </Box>
      )}
    </Box>
  )
}

