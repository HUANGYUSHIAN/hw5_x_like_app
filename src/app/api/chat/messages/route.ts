import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'

/**
 * GET /api/chat/messages?otherUserId=xxx&cursor=xxx&limit=50
 * 获取与指定用户的聊天记录
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    
    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('otherUserId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!otherUserId) {
      return NextResponse.json({ error: 'otherUserId is required' }, { status: 400 })
    }

    // 验证 otherUser 是否存在
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    })

    if (!otherUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 验证是否是双向 follow（可以聊天的用户）
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: otherUserId,
        },
      },
    })

    const isFollowedBy = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: otherUserId,
          followingId: session.user.id,
        },
      },
    })

    if (!isFollowing || !isFollowedBy) {
      return NextResponse.json(
        { error: 'You can only chat with mutual follows' },
        { status: 403 }
      )
    }

    // 查询消息：发送者或接收者是当前用户，且对方是 otherUser
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
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

    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, limit) : messages

    // 反转顺序，让最早的消息在前
    items.reverse()

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error: any) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/messages
 * 发送消息
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    
    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId, content } = body

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'receiverId and content are required' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      )
    }

    // 验证接收者是否存在
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
    }

    // 验证是否是双向 follow
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: receiverId,
        },
      },
    })

    const isFollowedBy = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: receiverId,
          followingId: session.user.id,
        },
      },
    })

    if (!isFollowing || !isFollowedBy) {
      return NextResponse.json(
        { error: 'You can only send messages to mutual follows' },
        { status: 403 }
      )
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: trimmedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    // 发送 Pusher 事件到接收者的私有频道
    try {
      const channelName = `private-user-${receiverId}`
      await pusherServer.trigger(channelName, 'message:received', {
        messageId: message.id,
        senderId: message.senderId,
        senderUserId: message.sender.userId,
        senderName: message.sender.name,
        content: message.content,
        createdAt: message.createdAt,
      })
      console.log(`[Pusher] Triggered message:received on ${channelName}`)
    } catch (error) {
      console.error('[Pusher] Failed to send message event:', error)
      // 不阻止消息创建，即使 Pusher 失败
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error('Create message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

