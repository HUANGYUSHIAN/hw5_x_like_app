import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getSession } from '@/lib/auth'
import { postSchema } from '@/lib/validations'
import { pusherServer } from '@/lib/pusher-server'

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
      console.log(`[Posts API] Session check - currentUserId:`, currentUserId, `filter:`, filter)
    } catch (error) {
      console.warn('Session error in posts GET:', error)
      // Continue without session - allow viewing posts without auth
    }

    let followingIds: string[] | undefined = undefined
    let userIdsToShow: string[] | undefined = undefined

    if (currentUserId) {
      // Get users that current user is following
      // When User B follows User A: followerId = B.id, followingId = A.id
      // So to get users that current user is following, we need: where followerId = currentUserId
      // This will return records where currentUserId is the follower, and we get the followingId (the users being followed)
      try {
        // First, let's also check what records exist in the database for debugging
        const allFollows = await prisma.follow.findMany({
          select: { followerId: true, followingId: true },
        })
        console.log(`[Posts API] All follow records in DB:`, allFollows)
        
        const following = await prisma.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true, followerId: true },
        })
        followingIds = following.map(f => f.followingId)
        
        console.log(`[Posts API] Current user ${currentUserId} is following:`, followingIds)
        console.log(`[Posts API] Found ${following.length} follow relationships`)
        console.log(`[Posts API] Raw follow records:`, following)
        
        // Also check reverse: who is following current user (for debugging)
        const followers = await prisma.follow.findMany({
          where: { followingId: currentUserId },
          select: { followerId: true },
        })
        console.log(`[Posts API] Users following current user ${currentUserId}:`, followers.map(f => f.followerId))
        
        if (filter === 'all') {
          // All mode: show current user's posts/reposts + following users' posts/reposts
          // Always include current user's own posts
          userIdsToShow = [currentUserId, ...followingIds]
          console.log(`[Posts API] All mode - showing posts from users:`, userIdsToShow)
        } else if (filter === 'following') {
          // Following mode: only show following users' posts/reposts (not current user's own)
          if (followingIds.length === 0) {
            // User is not following anyone, return empty array
            console.log(`[Posts API] Following mode - user is not following anyone`)
            return NextResponse.json({
              items: [],
              nextCursor: null,
            })
          }
          userIdsToShow = followingIds
          console.log(`[Posts API] Following mode - showing posts from users:`, userIdsToShow)
        }
      } catch (error) {
        console.error('Error fetching following users:', error)
        if (filter === 'following') {
          // If error in following mode, return empty array
          return NextResponse.json({
            items: [],
            nextCursor: null,
          })
        }
        // In all mode, if error, just show current user's posts
        if (filter === 'all' && currentUserId) {
          userIdsToShow = [currentUserId]
        }
      }
    } else if (filter === 'all') {
      // No session, show all posts
      userIdsToShow = undefined
      console.log(`[Posts API] No session - showing all posts`)
    } else {
      // No session and following filter - return empty
      console.log(`[Posts API] No session and following filter - returning empty`)
      return NextResponse.json({
        items: [],
        nextCursor: null,
      })
    }

    let postsWhere: any = {}
    if (userIdsToShow === undefined) {
      // Show all posts (no filter) - only when no session
      console.log(`[Posts API] No filter - showing all posts`)
    } else if (userIdsToShow.length === 0) {
      // Empty array - no posts to show (should not happen, but handle it)
      console.log(`[Posts API] Empty userIdsToShow - no posts to show`)
      postsWhere.authorId = { in: [] } // Explicitly set to empty to return no results
    } else {
      // Filter by userIdsToShow
      postsWhere.authorId = { in: userIdsToShow }
      console.log(`[Posts API] Filtering posts by authorId in:`, userIdsToShow)
    }
    
    console.log(`[Posts API] Final userIdsToShow:`, userIdsToShow)
    console.log(`[Posts API] Posts where clause:`, postsWhere)

    // Fetch posts
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

    // Get reposts for all or following filter
    let reposts: any[] = []
    if (userIdsToShow !== undefined && userIdsToShow.length > 0) {
      console.log(`[Posts API] Fetching reposts from users:`, userIdsToShow)
      reposts = await prisma.repost.findMany({
        where: {
          userId: { in: userIdsToShow },
        },
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
    }

    // Format posts
    const formattedPosts = posts.map((post: any) => ({
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
    const formattedReposts = reposts.map((repost: any) => ({
      type: 'repost',
      id: repost.id,
      createdAt: repost.createdAt,
      data: {
        repostedBy: {
          id: repost.user.id,
          userId: repost.user.userId,
          name: repost.user.name,
          avatarUrl: repost.user.avatarUrl,
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

    // Combine posts and reposts, sort by createdAt
    const allItems = [...formattedPosts, ...formattedReposts]
    allItems.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const hasMore = allItems.length > limit
    const items = hasMore ? allItems.slice(0, limit) : allItems

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error: any) {
    console.error('Get posts error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch posts'
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

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const validated = postSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user?.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        content: validated.content,
        ...(validated.imageUrl && { imageUrl: validated.imageUrl }),
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

      // Send Pusher event to public channel (for all posts view)
      try {
        await pusherServer.trigger('public-posts', 'post:created', {
          postId: post.id,
          authorId: post.authorId,
          authorUserId: user.userId,
          createdAt: post.createdAt,
        })
        console.log('[Pusher] Triggered post:created on public-posts for post:', post.id)
      } catch (error) {
        console.error('[Pusher] Failed to trigger public-posts event:', error)
      }
      
      // Also send to repost channel if this is a repost
      // (This will be handled in the repost API)

    // Also send to all followers' private channels (for following feed)
    // Get all followers of the author
    // When User B follows User A: followerId = B.id, followingId = A.id
    // So to get followers of author: where followingId = authorId
    const followers = await prisma.follow.findMany({
      where: { followingId: post.authorId },
      select: { followerId: true },
    })

    console.log(`[Pusher] Sending post:created to ${followers.length} followers of user ${user.userId}`)

    // Create notifications for all followers and send Pusher events
    const { createNotification } = await import('@/lib/notifications')
    
    for (const follow of followers) {
      try {
        // Create notification for each follower
        await createNotification({
          userId: follow.followerId,
          type: 'post', // New type for post notifications from followed users
          actorId: post.authorId,
          postId: post.id,
        })
        
        // Send Pusher event to follower's private channel
        const channelName = `private-user-${follow.followerId}`
        await pusherServer.trigger(channelName, 'post:created', {
          postId: post.id,
          authorId: post.authorId,
          authorUserId: user.userId,
          createdAt: post.createdAt,
        })
        console.log(`[Pusher] Triggered post:created on ${channelName} for post:`, post.id)
      } catch (error) {
        console.error(`[Pusher] Failed to send event to user ${follow.followerId}:`, error)
      }
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

