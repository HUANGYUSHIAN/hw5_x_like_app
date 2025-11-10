import { prisma } from './prisma'

/**
 * 生成随机的 20 个字符 userID（数字+英文字母）
 */
function generateRandomUserId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 生成唯一的 userID
 * 如果生成的 ID 已存在，则重新生成直到找到唯一的 ID
 */
export async function generateUniqueUserId(): Promise<string> {
  let attempts = 0
  const maxAttempts = 100 // 防止无限循环
  
  while (attempts < maxAttempts) {
    const userId = generateRandomUserId()
    
    // 检查是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    })
    
    if (!existingUser) {
      console.log(`[generateUniqueUserId] 生成唯一 userID: ${userId} (尝试次数: ${attempts + 1})`)
      return userId
    }
    
    attempts++
  }
  
  // 如果 100 次尝试都失败，抛出错误
  throw new Error('无法生成唯一的 userID，请重试')
}

