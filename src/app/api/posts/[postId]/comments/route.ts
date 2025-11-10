import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { commentSchema } from '@/lib/validations'
import { pusherServer } from '@/lib/pusher-server'
import { createNotification } from '@/lib/notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')
    const parentId = searchParams.get('parentId') || null

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: parentId || null,
      },
      include: {
        author: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'asc' },
    })

    const hasMore = comments.length > limit
    const items = hasMore ? comments.slice(0, limit) : comments

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { postId } = await params
    const body = await request.json()
    const validated = commentSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user?.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: user.id,
        content: validated.content,
        parentId: validated.parentId || null,
      },
      include: {
        author: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    })

    // Send Pusher event
    await pusherServer.trigger('public-posts', 'post:commented', {
      postId,
      comment,
    })
    await pusherServer.trigger(`user-${post.authorId}`, 'post:commented', {
      postId,
      comment,
    })

    // Create notification for post author
    await createNotification({
      userId: post.authorId,
      type: 'comment',
      actorId: user.id,
      postId,
      commentId: comment.id,
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

