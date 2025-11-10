'use client'

import { Typography, Link } from '@mui/material'

interface MessageContentProps {
  content: string
}

/**
 * 解析消息内容，识别 URL 并转换为可点击链接
 * 只支持纯文本和 hyperlink
 */
export default function MessageContent({ content }: MessageContentProps) {
  // URL 正则：匹配 http://, https://, www., 或域名格式
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi

  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null = null

  // 提取所有 URL
  const urlMatches: Array<{ url: string; index: number }> = []
  while ((match = urlRegex.exec(content)) !== null) {
    urlMatches.push({
      url: match[0],
      index: match.index,
    })
  }

  // 构建渲染部分
  if (urlMatches.length === 0) {
    // 没有 URL，直接返回文本
    return <Typography variant="body2">{content}</Typography>
  }

  // 有 URL，需要分割文本和链接
  urlMatches.forEach((urlMatch, idx) => {
    // 添加 URL 之前的文本
    if (urlMatch.index > lastIndex) {
      const text = content.substring(lastIndex, urlMatch.index)
      if (text) {
        parts.push(text)
      }
    }

    // 添加链接
    let href = urlMatch.url
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      href = `https://${href}`
    }

    parts.push(
      <Link
        key={idx}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ wordBreak: 'break-all' }}
      >
        {urlMatch.url}
      </Link>
    )

    lastIndex = urlMatch.index + urlMatch.url.length
  })

  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return (
    <Typography variant="body2" component="div">
      {parts.map((part, idx) => (
        <span key={idx}>{part}</span>
      ))}
    </Typography>
  )
}

