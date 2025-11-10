import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/chat/mutual-follows
 * 获取所有双向 follow 的用户（可以聊天的用户）
 * 双向 follow = A follow B 且 B follow A
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    
    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = session.user.id

    // 1. 获取当前用户 follow 的所有用户 (followingIds)
    const following = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    })
    const followingIds = following.map(f => f.followingId)

    // 2. 获取 follow 当前用户的所有用户 (followerIds)
    const followers = await prisma.follow.findMany({
      where: { followingId: currentUserId },
      select: { followerId: true },
    })
    const followerIds = followers.map(f => f.followerId)

    // 3. 找到交集：既是 following 又是 follower 的用户（双向 follow）
    const mutualFollowIds = followingIds.filter(id => followerIds.includes(id))

    if (mutualFollowIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // 4. 获取这些用户的详细信息
    const mutualUsers = await prisma.user.findMany({
      where: {
        id: { in: mutualFollowIds },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        avatarUrl: true,
        bio: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ items: mutualUsers })
  } catch (error: any) {
    console.error('Get mutual follows error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

