'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  IconButton,
} from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import CropIcon from '@mui/icons-material/Crop'

interface ImageUploaderProps {
  label: string
  value: string
  onChange: (url: string) => void
  previewSize?: { width: number; height: number }
  aspectRatio?: number
}

export default function ImageUploader({
  label,
  value,
  onChange,
  previewSize = { width: 200, height: 200 },
  aspectRatio,
}: ImageUploaderProps) {
  const [url, setUrl] = useState(value)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropScale, setCropScale] = useState(1)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setUrl(value)
    if (value) {
      loadImage(value)
    } else {
      setPreviewUrl(null)
      setImageLoaded(false)
    }
  }, [value])

  const loadImage = async (imageUrl: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    try {
      // Validate URL format
      new URL(imageUrl)

      // Try to load the image with multiple strategies
      const img = new Image()
      
      // First try without CORS (for same-origin images)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image load timeout'))
        }, 10000) // 10 second timeout

        img.onload = () => {
          clearTimeout(timeout)
          setPreviewUrl(imageUrl)
          setImageLoaded(true)
          setLoading(false)
          resolve(null)
        }
        
        img.onerror = () => {
          clearTimeout(timeout)
          // If CORS fails, try with crossOrigin
          const imgWithCors = new Image()
          imgWithCors.crossOrigin = 'anonymous'
          
          imgWithCors.onload = () => {
            setPreviewUrl(imageUrl)
            setImageLoaded(true)
            setLoading(false)
            resolve(null)
          }
          
          imgWithCors.onerror = () => {
            // If both fail, still allow the URL to be saved
            // The image might work when displayed directly in img tag
            setError('Preview unavailable (CORS restriction), but URL will be saved. You can still use this URL.')
            setPreviewUrl(imageUrl) // Set preview URL anyway
            setImageLoaded(false) // But mark as not loaded for preview purposes
            setLoading(false)
            resolve(null) // Don't reject, allow saving
          }
          
          imgWithCors.src = imageUrl
        }
        
        img.src = imageUrl
      })
    } catch (err: any) {
      if (err.message === 'Image load timeout') {
        setError('Image load timeout. URL will be saved, but preview is unavailable.')
        setPreviewUrl(imageUrl)
        setImageLoaded(false)
        setLoading(false)
      } else if (err.message !== 'Failed to load image') {
        setError('Invalid URL format')
        setLoading(false)
        setPreviewUrl(null)
        setImageLoaded(false)
      }
    }
  }

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    setError(null)
    if (newUrl.trim() === '') {
      setPreviewUrl(null)
      setImageLoaded(false)
      onChange('')
    }
  }

  const handleLoadImage = () => {
    if (url.trim()) {
      loadImage(url.trim())
    }
  }

  const handleConfirm = () => {
    if (previewUrl) {
      onChange(url.trim())
      setCropDialogOpen(false)
    }
  }

  const handleCrop = () => {
    if (!imgRef.current || !canvasRef.current || !previewUrl) return

    const img = imgRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = cropScale
    const x = cropX
    const y = cropY

    // Set canvas size
    canvas.width = previewSize.width
    canvas.height = previewSize.height

    // Calculate source dimensions
    const sourceWidth = img.naturalWidth / scale
    const sourceHeight = img.naturalHeight / scale

    // Calculate source position
    const sourceX = (img.naturalWidth - sourceWidth) / 2 + x * scale
    const sourceY = (img.naturalHeight - sourceHeight) / 2 + y * scale

    // Draw cropped image
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      previewSize.width,
      previewSize.height
    )

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png')
    setPreviewUrl(dataUrl)
    setUrl(dataUrl)
    onChange(dataUrl)
    setCropDialogOpen(false)
  }

  return (
    <Box>
      <TextField
        label={label}
        fullWidth
        margin="normal"
        value={url}
        onChange={(e) => handleUrlChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        helperText={error || "Enter an image URL and click 'Load Image' to preview"}
        error={!!error}
        InputProps={{
          endAdornment: (
            <Button
              onClick={handleLoadImage}
              disabled={!url.trim() || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <ImageIcon />}
              size="small"
            >
              Load
            </Button>
          ),
        }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {previewUrl && (
        <Paper
          elevation={2}
          sx={{
            mt: 2,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            {imageLoaded ? 'Preview' : 'URL Saved (Preview Unavailable)'}
          </Typography>
          {imageLoaded ? (
            <>
              <Box
                sx={{
                  position: 'relative',
                  width: previewSize.width,
                  height: previewSize.height,
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                }}
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  onLoad={() => setImageLoaded(true)}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<CropIcon />}
                  onClick={() => setCropDialogOpen(true)}
                  size="small"
                >
                  Adjust
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={handleConfirm}
                  size="small"
                >
                  Confirm
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setPreviewUrl(null)
                    setUrl('')
                    onChange('')
                    setImageLoaded(false)
                  }}
                  size="small"
                >
                  Clear
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The image URL has been saved. Preview is unavailable due to CORS restrictions,
                but the image should display correctly when used.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={handleConfirm}
                  size="small"
                >
                  Confirm & Save
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setPreviewUrl(null)
                    setUrl('')
                    onChange('')
                    setImageLoaded(false)
                  }}
                  size="small"
                >
                  Clear
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Crop/Adjust Dialog */}
      <Dialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Adjust Image</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxHeight: '400px',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                }}
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Crop preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    transform: `scale(${cropScale}) translate(${cropX}px, ${cropY}px)`,
                    transition: 'transform 0.1s',
                  }}
                />
              </Box>
              <Box>
                <Typography gutterBottom>Scale: {cropScale.toFixed(2)}</Typography>
                <Slider
                  value={cropScale}
                  onChange={(_, value) => setCropScale(value as number)}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
              </Box>
              <Box>
                <Typography gutterBottom>Position X: {cropX}</Typography>
                <Slider
                  value={cropX}
                  onChange={(_, value) => setCropX(value as number)}
                  min={-100}
                  max={100}
                  step={5}
                />
              </Box>
              <Box>
                <Typography gutterBottom>Position Y: {cropY}</Typography>
                <Slider
                  value={cropY}
                  onChange={(_, value) => setCropY(value as number)}
                  min={-100}
                  max={100}
                  step={5}
                />
              </Box>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCropDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCrop} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

