'use client'

import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ImageIcon from '@mui/icons-material/Image'
import DeleteIcon from '@mui/icons-material/Delete'
import { calculateCharacterCount } from '@/lib/utils'

interface PostComposerProps {
  open: boolean
  onClose: () => void
  onPost: () => void
  initialContent?: string
  draftId?: string
}

export default function PostComposer({ open, onClose, onPost, initialContent = '', draftId }: PostComposerProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [content, setContent] = useState(initialContent)
  const [charCount, setCharCount] = useState(0)
  const [isPosting, setIsPosting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [initialState, setInitialState] = useState({ content: '', imageUrl: null as string | null })
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{ id: string; userId: string; name: string; avatarUrl: string | null }>>([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 })
  const textFieldRef = React.useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setCharCount(calculateCharacterCount(content))
  }, [content])

  // Handle @mention autocomplete
  const handleContentChange = (newContent: string, cursorPosition: number) => {
    // Find @mention pattern before cursor
    const textBeforeCursor = newContent.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase()
      setMentionQuery(query)
      setMentionPosition({
        start: cursorPosition - mentionMatch[0].length,
        end: cursorPosition,
      })
      fetchMentionSuggestions(query)
      setShowMentionSuggestions(true)
    } else {
      setShowMentionSuggestions(false)
      setMentionSuggestions([])
    }
  }

  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Update cursor position after state update
    setTimeout(() => {
      if (textFieldRef.current) {
        const cursorPosition = textFieldRef.current.selectionStart || 0
        handleContentChange(e.target.value, cursorPosition)
      }
    }, 0)
  }

  const handleTextFieldKeyDown = (e: React.KeyboardEvent) => {
    // Close mention suggestions on Escape
    if (e.key === 'Escape' && showMentionSuggestions) {
      setShowMentionSuggestions(false)
      setMentionSuggestions([])
    }
    // Select mention on Enter (if suggestions are shown)
    else if (e.key === 'Enter' && showMentionSuggestions && mentionSuggestions.length > 0) {
      e.preventDefault()
      handleMentionSelect(mentionSuggestions[0].userId)
    }
  }

  const fetchMentionSuggestions = async (query: string) => {
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

      const response = await fetch(`/api/users/mentions?q=${encodeURIComponent(query)}`, {
        headers,
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setMentionSuggestions(data.users || [])
      }
    } catch (error) {
      console.error('Fetch mention suggestions error:', error)
    }
  }

  const handleMentionSelect = (userId: string) => {
    const beforeMention = content.substring(0, mentionPosition.start)
    const afterMention = content.substring(mentionPosition.end)
    const newContent = `${beforeMention}@${userId} ${afterMention}`
    setContent(newContent)
    setShowMentionSuggestions(false)
    setMentionSuggestions([])
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textFieldRef.current) {
        const newPosition = mentionPosition.start + userId.length + 2 // @ + userId + space
        textFieldRef.current.setSelectionRange(newPosition, newPosition)
        textFieldRef.current.focus()
      }
    }, 0)
  }

  useEffect(() => {
    if (open) {
      setContent(initialContent)
      setImageUrl(null)
      setInitialState({ content: initialContent, imageUrl: null })
    }
  }, [open, initialContent])

  const hasChanges = () => {
    return content.trim() !== initialState.content.trim() || imageUrl !== initialState.imageUrl
  }

  const handleCloseClick = () => {
    if (hasChanges()) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setContent('')
    setImageUrl(null)
    setShowDiscardDialog(false)
    onClose()
  }

  const handleSaveAndClose = async () => {
    await handleSaveDraft()
    setShowDiscardDialog(false)
  }

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl(null)
  }

  const handleDraftsClick = () => {
    router.push('/compose/post/unsent/drafts')
  }

  const handlePost = async () => {
    if (charCount > 280 || charCount === 0) return

    setIsPosting(true)
    try {
      // Use authenticated fetch if in localStorage mode
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
      
      const postData: any = { content }
      if (imageUrl) {
        postData.imageUrl = imageUrl
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(postData),
      })

      if (response.ok) {
        setContent('')
        setImageUrl(null)
        onPost()
        onClose()

        // Delete draft if it exists
        if (draftId) {
          await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' })
        }
      }
    } catch (error) {
      console.error('Post error:', error)
    } finally {
      setIsPosting(false)
    }
  }

  const handleSaveDraft = async () => {
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, id: draftId }),
      })
      onClose()
    } catch (error) {
      console.error('Save draft error:', error)
    }
  }

  const canPost = charCount > 0 && charCount <= 280 && !isPosting

  return (
    <>
      <Dialog open={open} onClose={handleCloseClick} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton onClick={handleCloseClick} size="small">
              <CloseIcon />
            </IconButton>
            <Button
              onClick={handleDraftsClick}
              sx={{ textTransform: 'none', color: 'primary.main', ml: 'auto' }}
            >
              Drafts
            </Button>
          </Box>
        </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Avatar src={session?.user?.image || undefined}>
            {session?.user?.name?.[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ position: 'relative' }}>
              <TextField
                inputRef={textFieldRef}
                multiline
                fullWidth
                rows={6}
                placeholder="What's happening?"
                value={content}
                onChange={handleTextFieldChange}
                onKeyDown={handleTextFieldKeyDown}
                variant="standard"
                sx={{ '& .MuiInputBase-input': { fontSize: '1.25rem' } }}
              />
              {showMentionSuggestions && mentionSuggestions.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    maxHeight: 200,
                    overflow: 'auto',
                    mt: 0.5,
                    boxShadow: 3,
                  }}
                >
                  <List dense>
                    {mentionSuggestions.map((user) => (
                      <ListItem key={user.id} disablePadding>
                        <ListItemButton onClick={() => handleMentionSelect(user.userId)}>
                          <ListItemAvatar>
                            <Avatar src={user.avatarUrl || undefined} sx={{ width: 32, height: 32 }}>
                              {user.name[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={user.name}
                            secondary={`@${user.userId}`}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
            {imageUrl && (
              <Box sx={{ position: 'relative', mt: 2, borderRadius: 2, overflow: 'hidden' }}>
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                />
                <IconButton
                  onClick={handleRemoveImage}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            type="file"
            onChange={handleImageInput}
          />
          <label htmlFor="image-upload">
            <IconButton component="span" color="primary">
              <ImageIcon />
            </IconButton>
          </label>
          <Typography
            variant="caption"
            color={charCount > 280 ? 'error' : 'text.secondary'}
          >
            {charCount}/280
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleSaveDraft} color="inherit">
          Save Draft
        </Button>
        <Button
          variant="contained"
          onClick={handlePost}
          disabled={!canPost}
        >
          Post
        </Button>
      </DialogActions>
      </Dialog>

      {/* Discard Confirmation Dialog */}
      <Dialog open={showDiscardDialog} onClose={() => setShowDiscardDialog(false)}>
        <DialogTitle>Discard post?</DialogTitle>
        <DialogContent>
          <Typography>
            This can't be undone and you'll lose your draft.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiscardDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAndClose} color="primary">
            Save Draft
          </Button>
          <Button onClick={handleDiscard} color="error">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}





