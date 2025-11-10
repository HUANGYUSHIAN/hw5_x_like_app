import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Check if current user is following target user
 * GET /api/users/[userId]/follow-status
 * Returns: { isFollowing: boolean, isFollowedBy: boolean }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId: targetUserId } = await params
    const currentUserId = session.user.id

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if current user is following target user
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    })

    // Check if target user is following current user (for "Follow Back" logic)
    const isFollowedBy = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUser.id,
          followingId: currentUserId,
        },
      },
    })

    return NextResponse.json({
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
    })
  } catch (error: any) {
    console.error('Get follow status error:', error)
    
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

