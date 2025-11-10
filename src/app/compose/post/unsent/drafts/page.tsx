'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Button,
  Paper,
  Slider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PostComposer from '@/components/post/PostComposer'
import { DraftWithAuthor } from '@/types'
import RelativeTime from '@/components/utils/RelativeTime'

export default function DraftsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [drafts, setDrafts] = useState<DraftWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<DraftWithAuthor | null>(null)
  const [sliderValue, setSliderValue] = useState(0)

  useEffect(() => {
    if (session) {
      fetchDrafts()
    }
  }, [session])

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/drafts')
      if (response.ok) {
        const data = await response.json()
        setDrafts(data)
        setSliderValue(0)
      }
    } catch (error) {
      console.error('Fetch drafts error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (draftId: string) => {
    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchDrafts()
      }
    } catch (error) {
      console.error('Delete draft error:', error)
    }
  }

  const handleEdit = (draft: DraftWithAuthor) => {
    setEditingDraft(draft)
    setComposerOpen(true)
  }

  const handleComposerClose = () => {
    setComposerOpen(false)
    setEditingDraft(null)
    fetchDrafts()
  }

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number)
  }

  const maxSliderValue = Math.max(0, drafts.length - 3)
  const visibleDrafts = drafts.slice(sliderValue, sliderValue + 3)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
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
        <IconButton onClick={() => router.push('/compose/post')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">
          Drafts
        </Typography>
      </Box>

      {drafts.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No drafts yet
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          {drafts.length > 3 && (
            <Box sx={{ mb: 2, px: 2 }}>
              <Slider
                value={sliderValue}
                onChange={handleSliderChange}
                min={0}
                max={maxSliderValue}
                step={1}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value + 1}-${Math.min(value + 3, drafts.length)}`}
              />
            </Box>
          )}
          <List>
            {visibleDrafts.map((draft) => (
              <ListItem
                key={draft.id}
                disablePadding
                sx={{ mb: 1 }}
              >
                <Paper
                  sx={{
                    width: '100%',
                    p: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1, mr: 2 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                        {draft.content || '(Empty)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <RelativeTime date={draft.updatedAt} />
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton onClick={() => handleEdit(draft)} size="small" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(draft.id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      <PostComposer
        open={composerOpen}
        onClose={handleComposerClose}
        onPost={handleComposerClose}
        initialContent={editingDraft?.content || ''}
        draftId={editingDraft?.id}
      />
    </Box>
  )
}




