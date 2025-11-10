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
  
  // 檢測 URL (http://, https://, www.)
  // 改進的 URL 正則表達式，支持更多格式
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi
  const urls = content.match(urlRegex) || []
  
  // 基礎字符數
  let count = content.length
  
  // 每個 URL 固定佔 23 字元（不管實際長度）
  urls.forEach(url => {
    count = count - url.length + 23
  })
  
  // hashtag 和 mention 正常計入字元數（它們是內容的一部分）
  
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
  // 改進的 URL 正則表達式，支持更多格式（包括 YouTube 等）
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi
  
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








