import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getSession } from '@/lib/auth'
import { postSchema } from '@/lib/validations'
import { pusherServer } from '@/lib/pusher-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const session = await getSession(request).catch(() => null)
    const currentUserId = session?.user?.id

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
        ...(currentUserId && {
          likes: {
            where: { userId: currentUserId },
            select: { id: true },
          },
        }),
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...post,
      isLiked: post.likes && post.likes.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      repostCount: post._count.reposts,
    })
  } catch (error) {
    console.error('Get post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { postId } = await params
    const body = await request.json()
    const validated = postSchema.parse(body)

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        reposts: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.authorId !== session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if this post is a repost (has reposts pointing to it)
    // Note: In this schema, reposts are separate entities, so we check if this post has any reposts
    // If a post is reposted, it means it's an original post, not a repost itself
    // We might want to add a different check if needed

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        content: validated.content,
        updatedAt: new Date(),
      },
      include: {
        author: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
      },
    })

    // Send Pusher event
    await pusherServer.trigger('public-posts', 'post:updated', {
      postId: updated.id,
      updatedFields: { content: updated.content },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { postId } = await params

    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.authorId !== session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete all reposts of this post first
    await prisma.repost.deleteMany({
      where: { postId },
    })

    // Delete all likes of this post
    await prisma.like.deleteMany({
      where: { postId },
    })

    // Delete all comments of this post
    await prisma.comment.deleteMany({
      where: { postId },
    })

    // Finally delete the post
    await prisma.post.delete({
      where: { id: postId },
    })

    // Send Pusher event
    await pusherServer.trigger('public-posts', 'post:deleted', {
      postId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

