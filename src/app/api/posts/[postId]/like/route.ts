import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { postId } = await params
    const currentUserId = session.user?.id

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: currentUserId,
          postId,
        },
      },
    })

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: currentUserId,
            postId,
          },
        },
      })

      const likeCount = await prisma.like.count({
        where: { postId },
      })

      // Send Pusher event
      await pusherServer.trigger('public-posts', 'post:liked', {
        postId,
        likeCount,
        action: 'unliked',
      })
      await pusherServer.trigger(`user-${post.authorId}`, 'post:liked', {
        postId,
        likeCount,
        action: 'unliked',
      })

      return NextResponse.json({ action: 'unliked', likeCount })
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId: currentUserId,
          postId,
        },
      })

      const likeCount = await prisma.like.count({
        where: { postId },
      })

      // Send Pusher event
      await pusherServer.trigger('public-posts', 'post:liked', {
        postId,
        likeCount,
        action: 'liked',
      })
      await pusherServer.trigger(`user-${post.authorId}`, 'post:liked', {
        postId,
        likeCount,
        action: 'liked',
      })

      // Create notification for post author
      await createNotification({
        userId: post.authorId,
        type: 'like',
        actorId: currentUserId,
        postId,
      })

      return NextResponse.json({ action: 'liked', likeCount })
    }
  } catch (error) {
    console.error('Like/unlike error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

