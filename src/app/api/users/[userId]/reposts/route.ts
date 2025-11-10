import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

    // Get all reposts by this user, ordered by createdAt (most recent first)
    const reposts = await prisma.repost.findMany({
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
            ...(currentUserId && {
              likes: {
                where: { userId: currentUserId },
                select: { id: true },
              },
              reposts: {
                where: { userId: currentUserId },
                select: { id: true },
              },
            }),
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format the posts
    const formattedReposts = reposts.map((repost) => ({
      repostedBy: {
        id: repost.userId,
        userId: userId,
        name: '', // Will be filled by frontend if needed
      },
      post: {
        ...repost.post,
        isLiked: repost.post.likes && repost.post.likes.length > 0,
        isReposted: repost.post.reposts && repost.post.reposts.length > 0,
        likeCount: repost.post._count.likes,
        commentCount: repost.post._count.comments,
        repostCount: repost.post._count.reposts,
      },
      createdAt: repost.createdAt,
    }))

    return NextResponse.json({
      items: formattedReposts,
    })
  } catch (error) {
    console.error('Get user reposts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

