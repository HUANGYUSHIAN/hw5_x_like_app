import { User, Post, Comment, Like, Follow, Draft } from '@prisma/client'

export type UserWithCounts = User & {
  _count?: {
    posts: number
    followers: number
    following: number
  }
}

export type PostWithAuthor = Post & {
  author: User
  _count?: {
    likes: number
    comments: number
    reposts: number
  }
  isLiked?: boolean
  isReposted?: boolean
}

export type CommentWithAuthor = Comment & {
  author: User
  replies?: CommentWithAuthor[]
  _count?: {
    replies: number
  }
}

export type DraftWithAuthor = Draft & {
  author: User
}











