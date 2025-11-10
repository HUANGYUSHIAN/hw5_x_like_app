import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { userId: targetUserId } = await params
    const currentUserId = session.user?.id

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    })

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUser.id,
          },
        },
      })

      // Send Pusher event
      await pusherServer.trigger(`user-${targetUser.id}`, 'user:unfollowed', {
        followerId: currentUserId,
      })

      return NextResponse.json({ action: 'unfollowed' })
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      })

      // Send Pusher event
      await pusherServer.trigger(`user-${targetUser.id}`, 'user:followed', {
        followerId: currentUserId,
      })
      await pusherServer.trigger(`private-user-${targetUser.id}`, 'user:followed', {
        followerId: currentUserId,
        followerUserId: session.user?.userId,
      })

      // Create notification for followed user
      await createNotification({
        userId: targetUser.id,
        type: 'follow',
        actorId: currentUserId,
      })

      return NextResponse.json({ action: 'followed' })
    }
  } catch (error: any) {
    console.error('Follow/unfollow error:', error)
    
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

