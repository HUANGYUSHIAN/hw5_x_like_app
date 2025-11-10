'use client'

import { useEffect, useState } from 'react'
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
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PostComposer from '@/components/post/PostComposer'
import { DraftWithAuthor } from '@/types'
import RelativeTime from '@/components/utils/RelativeTime'

export default function DraftsPage() {
  const { data: session } = useSession()
  const [drafts, setDrafts] = useState<DraftWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<DraftWithAuthor | null>(null)

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Drafts
      </Typography>
      {drafts.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No drafts yet
          </Typography>
        </Box>
      ) : (
        <List>
          {drafts.map((draft) => (
            <ListItem
              key={draft.id}
              secondaryAction={
                <Box>
                  <IconButton onClick={() => handleEdit(draft)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(draft.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {draft.content || '(Empty)'}
                  </Typography>
                }
                secondary={<RelativeTime date={draft.updatedAt} />}
              />
            </ListItem>
          ))}
        </List>
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





