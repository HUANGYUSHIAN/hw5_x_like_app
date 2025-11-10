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
      include: {
        author: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already reposted
    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId: currentUserId,
          postId,
        },
      },
    })

    if (existingRepost) {
      // Undo repost
      await prisma.repost.delete({
        where: {
          userId_postId: {
            userId: currentUserId,
            postId,
          },
        },
      })

      const repostCount = await prisma.repost.count({
        where: { postId },
      })

      // Send Pusher event
      await pusherServer.trigger('public-posts', 'post:reposted', {
        postId,
        repostCount,
        action: 'unreposted',
      })
      await pusherServer.trigger(`user-${post.authorId}`, 'post:reposted', {
        postId,
        repostCount,
        action: 'unreposted',
      })

      return NextResponse.json({ action: 'unreposted', repostCount })
    } else {
      // Create repost
      await prisma.repost.create({
        data: {
          userId: currentUserId,
          postId,
        },
      })

      const repostCount = await prisma.repost.count({
        where: { postId },
      })

      // Send Pusher event
      await pusherServer.trigger('public-posts', 'post:reposted', {
        postId,
        repostCount,
        action: 'reposted',
      })
      await pusherServer.trigger(`user-${post.authorId}`, 'post:reposted', {
        postId,
        repostCount,
        action: 'reposted',
      })

      // Create notification for post author
      await createNotification({
        userId: post.authorId,
        type: 'repost',
        actorId: currentUserId,
        postId,
      })

      return NextResponse.json({ action: 'reposted', repostCount })
    }
  } catch (error) {
    console.error('Repost error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

