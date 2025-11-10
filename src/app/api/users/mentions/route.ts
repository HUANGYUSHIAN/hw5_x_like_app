import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/**
 * Get mention suggestions for current user
 * Returns users that the current user follows or that follow the current user
 * GET /api/users/mentions?q=user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase().trim() || ''

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get users that current user is following
    const followingRelations = await prisma.follow.findMany({
      where: { followerId: currentUser.id },
      include: {
        following: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    // Get users that follow current user
    const followerRelations = await prisma.follow.findMany({
      where: { followingId: currentUser.id },
      include: {
        follower: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    // Combine and deduplicate users
    const mentionUsers = new Map<string, { id: string; userId: string; name: string; avatarUrl: string | null }>()
    
    followingRelations.forEach(rel => {
      if (rel.following.id !== currentUser.id) {
        mentionUsers.set(rel.following.id, {
          id: rel.following.id,
          userId: rel.following.userId,
          name: rel.following.name,
          avatarUrl: rel.following.avatarUrl,
        })
      }
    })

    followerRelations.forEach(rel => {
      if (rel.follower.id !== currentUser.id) {
        mentionUsers.set(rel.follower.id, {
          id: rel.follower.id,
          userId: rel.follower.userId,
          name: rel.follower.name,
          avatarUrl: rel.follower.avatarUrl,
        })
      }
    })

    // Filter by query if provided
    let results = Array.from(mentionUsers.values())
    if (query) {
      results = results.filter(user => 
        user.userId.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
      )
    }

    // Sort by userId for consistent ordering
    results.sort((a, b) => a.userId.localeCompare(b.userId))

    return NextResponse.json({
      users: results.slice(0, 10), // Limit to 10 suggestions
    })
  } catch (error: any) {
    console.error('Get mentions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}




