import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await getSession(request).catch(() => null)
    const currentUserId = session?.user?.id

    // Get user by userId (not id)
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only allow users to view their own likes
    if (!currentUserId || currentUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all likes for this user, ordered by createdAt (most recent first)
    const likes = await prisma.like.findMany({
      where: { userId: user.id },
      include: {
        post: {
          include: {
            author: true,
            _count: {
              select: {
                likes: true,
                comments: true,
                reposts: true,
              },
            },
            likes: {
              where: { userId: user.id },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format the posts
    const formattedPosts = likes.map((like) => ({
      ...like.post,
      isLiked: true, // User has liked this post
      likeCount: like.post._count.likes,
      commentCount: like.post._count.comments,
      repostCount: like.post._count.reposts,
    }))

    return NextResponse.json({
      items: formattedPosts,
    })
  } catch (error) {
    console.error('Get user likes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



