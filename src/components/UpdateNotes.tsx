'use client'

import { Box, Typography, Paper } from '@mui/material'
import { useEffect, useState, ReactElement } from 'react'
import Link from 'next/link'

interface UpdateNotesProps {
  className?: string
}

/**
 * 自动识别文本中的超链接并渲染
 */
function renderTextWithLinks(text: string) {
  // URL 正则表达式：匹配 http://, https://, 或 www. 开头的 URL
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  
  const parts: (string | ReactElement)[] = []
  let lastIndex = 0
  let match
  
  while ((match = urlRegex.exec(text)) !== null) {
    // 添加 URL 之前的文本
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index)
      if (beforeText) {
        parts.push(beforeText)
      }
    }
    
    // 添加链接
    const url = match[0]
    const href = url.startsWith('http') ? url : `https://${url}`
    parts.push(
      <Link
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#1976d2', textDecoration: 'underline' }}
      >
        {url}
      </Link>
    )
    
    lastIndex = match.index + url.length
  }
  
  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return parts.length > 0 ? parts : [text]
}

export default function UpdateNotes({ className }: UpdateNotesProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUpdateNotes = async () => {
      try {
        const response = await fetch('/api/update-notes')
        const data = await response.json()
        
        if (data.success && data.content) {
          setContent(data.content)
        }
      } catch (error) {
        console.error('Failed to fetch update notes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUpdateNotes()
  }, [])

  // 如果没有内容，不显示
  if (loading || !content.trim()) {
    return null
  }

  // 按行分割内容，每行单独渲染
  const lines = content.split('\n').filter(line => line.trim())

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        backgroundColor: '#f5f5f5',
        borderLeft: '4px solid #1976d2',
      }}
      className={className}
    >
      <Typography
        variant="body2"
        component="div"
        sx={{
          whiteSpace: 'pre-line',
          lineHeight: 1.8,
          color: 'text.primary',
        }}
      >
        {lines.map((line, index) => (
          <Box key={index} sx={{ mb: index < lines.length - 1 ? 1 : 0 }}>
            {renderTextWithLinks(line.trim())}
          </Box>
        ))}
      </Typography>
    </Paper>
  )
}

