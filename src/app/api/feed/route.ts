import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')
    const filter = searchParams.get('filter') || 'all' // 'all' | 'following'
    
    // Get session with error handling
    let session = null
    let currentUserId: string | undefined = undefined
    
    try {
      session = await getSession(request)
      currentUserId = session?.user?.id
    } catch (error) {
      console.warn('Session error in feed GET:', error)
      // Continue without session - allow viewing feed without auth
    }

    let authorIds: string[] | undefined = undefined

    if (filter === 'following' && currentUserId) {
      // Get users that current user is following
      try {
        const following = await prisma.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        })
        const followingIds = following.map(f => f.followingId)
        
        if (followingIds.length === 0) {
          // User is not following anyone, return empty array
          return NextResponse.json({
            items: [],
            nextCursor: null,
          })
        }
        
        authorIds = followingIds
      } catch (error) {
        console.error('Error fetching following users:', error)
        return NextResponse.json({
          items: [],
          nextCursor: null,
        })
      }
    }

    // Get posts (original posts)
    const postsWhere: any = {}
    if (authorIds) {
      postsWhere.authorId = { in: authorIds }
    }

    const posts = await prisma.post.findMany({
      where: postsWhere,
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
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    })

    // Get reposts
    const repostsWhere: any = {}
    if (authorIds) {
      // Get reposts by users that current user is following
      repostsWhere.userId = { in: authorIds }
    }

    const reposts = await prisma.repost.findMany({
      where: repostsWhere,
      include: {
        user: true,
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
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    })

    // Combine and sort by createdAt
    const feedItems: any[] = []

    // Add posts as feed items
    posts.forEach((post) => {
      feedItems.push({
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
      })
    })

    // Add reposts as feed items
    reposts.forEach((repost) => {
      feedItems.push({
        type: 'repost',
        id: repost.id,
        createdAt: repost.createdAt,
        data: {
          repostedBy: repost.user,
          post: {
            ...repost.post,
            isLiked: repost.post.likes && repost.post.likes.length > 0,
            isReposted: repost.post.reposts && repost.post.reposts.length > 0,
            likeCount: repost.post._count.likes,
            commentCount: repost.post._count.comments,
            repostCount: repost.post._count.reposts,
          },
        },
      })
    })

    // Sort by createdAt (most recent first)
    feedItems.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const hasMore = feedItems.length > limit
    const items = hasMore ? feedItems.slice(0, limit) : feedItems

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error: any) {
    console.error('Get feed error:', error)
    
    let errorMessage = 'Failed to fetch feed'
    if (error?.message?.includes('timeout')) {
      errorMessage = 'Database connection timeout. Please check your MongoDB connection.'
    } else if (error?.message?.includes('Server selection timeout')) {
      errorMessage = 'MongoDB connection failed. Please check your database settings.'
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

