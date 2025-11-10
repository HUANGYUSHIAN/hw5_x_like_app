import { z } from 'zod'

export const postSchema = z.object({
  content: z.string().min(1).max(10000), // 實際字元計數在前端處理
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
})

export const commentSchema = z.object({
  content: z.string().min(1).max(10000),
  parentId: z.string().optional(),
})

export const draftSchema = z.object({
  content: z.string().max(10000),
})

export const userUpdateSchema = z.object({
  userId: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, 'User ID can only contain letters, numbers, and underscores').optional(),
  name: z.string().min(1).max(100).optional(),
  // email 不允许修改（OAuth 绑定）
  // email: z.string().email().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
  backgroundUrl: z.string().url().optional().nullable().or(z.literal('')),
})

export const userIdSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/)





