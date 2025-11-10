import { prisma } from './prisma'
import { pusherServer } from './pusher-server'

export async function createNotification(data: {
  userId: string
  type: 'like' | 'comment' | 'repost' | 'follow' | 'post'
  actorId: string
  postId?: string
  commentId?: string
}) {
  try {
    // Don't create notification if user is acting on their own content
    if (data.userId === data.actorId) {
      return null
    }

    // Check if notification already exists for this action
    const existing = await prisma.notification.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        actorId: data.actorId,
        ...(data.postId && { postId: data.postId }),
        ...(data.commentId && { commentId: data.commentId }),
      },
    })

    if (existing) {
      // Update existing notification to unread
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: { read: false, createdAt: new Date() },
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

      // Send Pusher event
      await pusherServer.trigger(`private-user-${data.userId}`, 'notification:created', {
        notification: updated,
      })

      return updated
    }

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        actorId: data.actorId,
        ...(data.postId && { postId: data.postId }),
        ...(data.commentId && { commentId: data.commentId }),
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

    // Send Pusher event
    await pusherServer.trigger(`private-user-${data.userId}`, 'notification:created', {
      notification,
    })

    return notification
  } catch (error) {
    console.error('Create notification error:', error)
    return null
  }
}

