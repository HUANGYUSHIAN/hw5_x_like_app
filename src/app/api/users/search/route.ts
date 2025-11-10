import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Search users by userId, name, or bio
 * GET /api/users/search?q=searchterm&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!query || query.length === 0) {
      return NextResponse.json({ items: [], total: 0 })
    }

    // Get current user session to exclude from results and check follow status
    const session = await getSession(request)
    const currentUserId = session?.user?.id

    // For MongoDB, Prisma's contains is case-sensitive
    // We'll fetch all users and filter case-insensitively in memory
    const queryLower = query.toLowerCase()
    
    // Fetch all users (or a large batch) to allow case-insensitive filtering
    // This is necessary because MongoDB/Prisma doesn't support case-insensitive contains easily
    const allUsers = await prisma.user.findMany({
      take: 1000, // Get a large batch to filter from
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        avatarUrl: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter case-insensitively - match if query appears in userId, name, or bio
    const users = allUsers.filter((user) => {
      const userIdMatch = user.userId?.toLowerCase().includes(queryLower) || false
      const nameMatch = user.name?.toLowerCase().includes(queryLower) || false
      const bioMatch = user.bio?.toLowerCase().includes(queryLower) || false
      return userIdMatch || nameMatch || bioMatch
    }).slice(0, limit)

    // Always exclude current user from search results (prevent self-follow)
    // If user is logged in, check follow status for each result
    let usersWithFollowStatus = users
    if (currentUserId) {
      // First, get current user's userId to exclude by userId as well
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { userId: true },
      })

      // Get all users that current user is following
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      })
      const followingIds = new Set(following.map(f => f.followingId))

      // Get all users that follow current user (for "Follow Back" logic)
      const followers = await prisma.follow.findMany({
        where: { followingId: currentUserId },
        select: { followerId: true },
      })
      const followerIds = new Set(followers.map(f => f.followerId))

      // Exclude current user by both id and userId
      usersWithFollowStatus = users
        .filter(user => {
          // Exclude by id
          if (user.id === currentUserId) return false
          // Exclude by userId if available
          if (currentUser && user.userId === currentUser.userId) return false
          return true
        })
        .map(user => ({
          ...user,
          isFollowing: followingIds.has(user.id),
          isFollowedBy: followerIds.has(user.id),
        }))
    } else {
      // If not logged in, still return results (but no follow status)
      usersWithFollowStatus = users
    }

    return NextResponse.json({
      items: usersWithFollowStatus,
      total: usersWithFollowStatus.length,
    })
  } catch (error: any) {
    console.error('Search users error:', error)
    
    // Handle MongoDB connection errors
    if (error.message?.includes('Server selection timeout') || 
        error.message?.includes('timed out') ||
        error.message?.includes('I/O error')) {
      return NextResponse.json(
        { 
          error: 'Database connection timeout',
          message: 'Unable to connect to database. Please check your connection settings.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

