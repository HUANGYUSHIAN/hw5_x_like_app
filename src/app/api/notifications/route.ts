import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor')

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      include: {
        actor: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                userId: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        comment: {
          include: {
            author: {
              select: {
                id: true,
                userId: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    })

    const hasMore = notifications.length > limit
    const items = hasMore ? notifications.slice(0, limit) : notifications

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const { type, userId, actorId, postId, commentId } = body

    if (!type || !userId || !actorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Don't create notification if user is acting on their own content
    if (userId === actorId) {
      return NextResponse.json({ message: 'No notification needed' }, { status: 200 })
    }

    // Check if notification already exists for this action
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        actorId,
        ...(postId && { postId }),
        ...(commentId && { commentId }),
      },
    })

    if (existing) {
      // Update existing notification to unread
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: { read: false, createdAt: new Date() },
      })
      return NextResponse.json(updated, { status: 200 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        actorId,
        ...(postId && { postId }),
        ...(commentId && { commentId }),
      },
      include: {
        actor: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error: any) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

