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

    // Get all posts by this user
    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
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
      orderBy: { createdAt: 'desc' },
    })

    // Get all reposts by this user
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

    // Format posts
    const formattedPosts = posts.map((post) => ({
      type: 'post',
      id: post.id,
      createdAt: post.createdAt,
      data: {
        ...post,
        isLiked: post.likes && post.likes.length > 0,
        isReposted: post.reposts && post.reposts.length > 0,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        repostCount: post._count.reposts,
      },
    }))

    // Format reposts
    const formattedReposts = reposts.map((repost) => ({
      type: 'repost',
      id: repost.id,
      createdAt: repost.createdAt,
      data: {
        repostedBy: {
          id: repost.userId,
          userId: userId,
          name: '', // Will be filled by frontend
        },
        post: {
          ...repost.post,
          isLiked: repost.post.likes && repost.post.likes.length > 0,
          isReposted: repost.post.reposts && repost.post.reposts.length > 0,
          likeCount: repost.post._count.likes,
          commentCount: repost.post._count.comments,
          repostCount: repost.post._count.reposts,
        },
      },
    }))

    // Combine and sort by createdAt (most recent first)
    const allItems = [...formattedPosts, ...formattedReposts]
    allItems.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      items: allItems,
    })
  } catch (error) {
    console.error('Get user posts and reposts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

