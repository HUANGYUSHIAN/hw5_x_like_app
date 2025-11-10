'use client'

import { parseContent } from '@/lib/utils'
import { Link, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

interface ContentParserProps {
  content: string
  variant?: 'body1' | 'body2'
}

export default function ContentParser({ content, variant = 'body1' }: ContentParserProps) {
  const router = useRouter()
  const { text, hashtags, mentions, urls } = parseContent(content)

  const handleHashtagClick = (hashtag: string) => {
    // Navigate to hashtag search (to be implemented)
    console.log('Hashtag clicked:', hashtag)
  }

  const handleMentionClick = (mention: string, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，防止触发父元素的点击事件
    router.push(`/${mention}`)
  }

  const handleUrlClick = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Improved parsing and rendering - process in order: URLs first, then hashtags, then mentions
  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  
  // 改進的正則表達式，優先匹配 URL（避免與 hashtag/mention 衝突）
  // URL 正則：匹配 http://, https://, www., 或域名格式
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi
  const hashtagRegex = /#(\w+)/g
  const mentionRegex = /@(\w+)/g
  
  // 收集所有匹配項及其位置
  interface MatchItem {
    type: 'url' | 'hashtag' | 'mention'
    text: string
    index: number
    length: number
  }
  
  const matches: MatchItem[] = []
  let match: RegExpExecArray | null = null
  
  // 提取 URLs
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({
      type: 'url',
      text: match[0],
      index: match.index,
      length: match[0].length,
    })
  }
  
  // 提取 hashtags（排除已在 URL 中的部分）
  while ((match = hashtagRegex.exec(text)) !== null) {
    const currentMatch = match // TypeScript guard
    const isInUrl = matches.some(m => 
      m.type === 'url' && 
      currentMatch.index >= m.index && 
      currentMatch.index < m.index + m.length
    )
    if (!isInUrl) {
      matches.push({
        type: 'hashtag',
        text: currentMatch[0],
        index: currentMatch.index,
        length: currentMatch[0].length,
      })
    }
  }
  
  // 提取 mentions（排除已在 URL 中的部分）
  while ((match = mentionRegex.exec(text)) !== null) {
    const currentMatch = match // TypeScript guard
    const isInUrl = matches.some(m => 
      m.type === 'url' && 
      currentMatch.index >= m.index && 
      currentMatch.index < m.index + m.length
    )
    if (!isInUrl) {
      matches.push({
        type: 'mention',
        text: currentMatch[0],
        index: currentMatch.index,
        length: currentMatch[0].length,
      })
    }
  }
  
  // 按位置排序
  matches.sort((a, b) => a.index - b.index)
  
  // 構建渲染部分
  for (const matchItem of matches) {
    // 添加匹配前的文本
    if (matchItem.index > lastIndex) {
      parts.push(text.substring(lastIndex, matchItem.index))
    }
    
    // 根據類型渲染
    if (matchItem.type === 'hashtag') {
      const hashtag = matchItem.text.substring(1)
      parts.push(
        <Link
          key={matchItem.index}
          component="button"
          variant="inherit"
          onClick={() => handleHashtagClick(hashtag)}
          sx={{ color: 'primary.main', textDecoration: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          {matchItem.text}
        </Link>
      )
    } else if (matchItem.type === 'mention') {
      const mention = matchItem.text.substring(1)
      parts.push(
        <Link
          key={matchItem.index}
          component="button"
          variant="inherit"
          onClick={(e: React.MouseEvent) => handleMentionClick(mention, e)}
          sx={{ color: 'primary.main', textDecoration: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          {matchItem.text}
        </Link>
      )
    } else {
      // URL
      let url = matchItem.text
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      parts.push(
        <Link
          key={matchItem.index}
          href={url}
          onClick={(e) => handleUrlClick(url, e)}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: 'primary.main', textDecoration: 'underline' }}
        >
          {matchItem.text}
        </Link>
      )
    }
    
    lastIndex = matchItem.index + matchItem.length
  }
  
  // 添加剩餘文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return (
    <Typography variant={variant} component="div">
      {parts.length > 0 ? parts : text}
    </Typography>
  )
}








