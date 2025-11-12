import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-tw'

dayjs.extend(relativeTime)
dayjs.locale('zh-tw')

export function formatRelativeTime(date: Date | string): string {
  const now = dayjs()
  const target = dayjs(date)
  const diffInDays = now.diff(target, 'day')
  
  if (diffInDays > 365) {
    return target.format('YYYY年MM月DD日')
  }
  
  return target.fromNow()
}

export function calculateCharacterCount(content: string): number {
  if (!content) return 0
  
  // 使用與 parseContent 相同的正則表達式，確保一致性
  // 只匹配明確的 URL 格式（http://, https://, 或 www. 開頭）
  const urlRegex = /(https?:\/\/[^\s]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi
  const hashtagRegex = /#(\w+)/g
  const mentionRegex = /@([a-zA-Z0-9_]+)/g
  
  // 基礎字符數
  let count = content.length
  
  // 收集所有匹配項及其位置
  interface MatchItem {
    text: string
    index: number
    length: number
    type: 'url' | 'hashtag' | 'mention'
  }
  
  const allMatches: MatchItem[] = []
  let match: RegExpExecArray | null = null
  
  // 重置正則表達式的 lastIndex（重要：避免全局正則表達式的狀態問題）
  urlRegex.lastIndex = 0
  hashtagRegex.lastIndex = 0
  mentionRegex.lastIndex = 0
  
  // 提取 URLs
  while ((match = urlRegex.exec(content)) !== null) {
    allMatches.push({
      text: match[0],
      index: match.index,
      length: match[0].length,
      type: 'url',
    })
  }
  
  // 提取 Hashtags（排除已在 URL 中的部分）
  while ((match = hashtagRegex.exec(content)) !== null) {
    const currentMatch = match
    const isInUrl = allMatches.some(m => 
      m.type === 'url' &&
      currentMatch.index >= m.index && 
      currentMatch.index < m.index + m.length
    )
    if (!isInUrl) {
      allMatches.push({
        text: currentMatch[0],
        index: currentMatch.index,
        length: currentMatch[0].length,
        type: 'hashtag',
      })
    }
  }
  
  // 提取 Mentions（排除已在 URL 中的部分）
  while ((match = mentionRegex.exec(content)) !== null) {
    const currentMatch = match
    const isInUrl = allMatches.some(m => 
      m.type === 'url' &&
      currentMatch.index >= m.index && 
      currentMatch.index < m.index + m.length
    )
    if (!isInUrl) {
      allMatches.push({
        text: currentMatch[0],
        index: currentMatch.index,
        length: currentMatch[0].length,
        type: 'mention',
      })
    }
  }
  
  // 按位置排序，確保正確處理重疊
  allMatches.sort((a, b) => a.index - b.index)
  
  // 處理每個匹配項（從後往前處理，避免索引變化影響）
  // 或者使用一個標記數組來追蹤已處理的位置
  const processedRanges: Array<{ start: number; end: number }> = []
  
  for (const matchItem of allMatches) {
    // 檢查是否與已處理的範圍重疊
    const overlaps = processedRanges.some(range => 
      matchItem.index < range.end && matchItem.index + matchItem.length > range.start
    )
    
    if (overlaps) {
      continue // 跳過重疊的匹配項
    }
    
    if (matchItem.type === 'url') {
      // URL：固定佔 23 字元（不管實際長度）
      count = count - matchItem.length + 23
    } else {
      // Hashtag 或 Mention：不計入字元數
      count = count - matchItem.length
    }
    
    // 記錄已處理的範圍
    processedRanges.push({
      start: matchItem.index,
      end: matchItem.index + matchItem.length,
    })
  }
  
  return count
}

export function parseContent(content: string): {
  text: string
  hashtags: string[]
  mentions: string[]
  urls: { url: string; display: string }[]
} {
  const hashtagRegex = /#(\w+)/g
  const mentionRegex = /@(\w+)/g
  // 改進的 URL 正則表達式，只匹配明確的 URL 格式
  // 只匹配 http://, https://, 或 www. 開頭的 URL，避免誤識別普通文本為連結
  const urlRegex = /(https?:\/\/[^\s]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi
  
  const hashtags: string[] = []
  const mentions: string[] = []
  const urls: { url: string; display: string }[] = []
  
  let match
  
  // 提取 hashtags
  while ((match = hashtagRegex.exec(content)) !== null) {
    if (!hashtags.includes(match[1])) {
      hashtags.push(match[1])
    }
  }
  
  // 提取 mentions
  while ((match = mentionRegex.exec(content)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1])
    }
  }
  
  // 提取 URLs（需要先提取 URL，避免與 hashtag/mention 衝突）
  const urlMatches: Array<{ url: string; index: number }> = []
  while ((match = urlRegex.exec(content)) !== null) {
    urlMatches.push({ url: match[0], index: match.index })
  }
  
  // 處理 URL，確保正確格式化（添加 http:// 如果缺少）
  urlMatches.forEach(({ url }) => {
    let normalizedUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = 'https://' + url
    }
    urls.push({
      url: normalizedUrl,
      display: url.length > 50 ? url.substring(0, 50) + '...' : url,
    })
  })
  
  return { text: content, hashtags, mentions, urls }
}








