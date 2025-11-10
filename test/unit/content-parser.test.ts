import { describe, it, expect } from 'vitest'
import { parseContent } from '@/lib/utils'

describe('Content Parser', () => {
  it('should parse hashtags', () => {
    const content = 'This is a #test post with #hashtags'
    const result = parseContent(content)
    
    expect(result.hashtags).toContain('test')
    expect(result.hashtags).toContain('hashtags')
    expect(result.hashtags.length).toBe(2)
  })

  it('should parse mentions', () => {
    const content = 'Hello @user1 and @user2'
    const result = parseContent(content)
    
    expect(result.mentions).toContain('user1')
    expect(result.mentions).toContain('user2')
    expect(result.mentions.length).toBe(2)
  })

  it('should parse URLs', () => {
    const content = 'Check out https://example.com and www.test.com'
    const result = parseContent(content)
    
    expect(result.urls.length).toBe(2)
    expect(result.urls[0].url).toContain('https://example.com')
    expect(result.urls[1].url).toContain('www.test.com')
  })

  it('should parse all content types together', () => {
    const content = 'Hello @user1, check out #awesome https://example.com'
    const result = parseContent(content)
    
    expect(result.hashtags).toContain('awesome')
    expect(result.mentions).toContain('user1')
    expect(result.urls.length).toBe(1)
  })

  it('should handle empty content', () => {
    const result = parseContent('')
    
    expect(result.hashtags.length).toBe(0)
    expect(result.mentions.length).toBe(0)
    expect(result.urls.length).toBe(0)
  })
})











