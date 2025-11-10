import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    const user = await prisma.user.findUnique({
      where: { userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: true,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    })

    const hasMore = followers.length > limit
    const items = hasMore ? followers.slice(0, limit) : followers

    return NextResponse.json({
      items: items.map(f => f.follower),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error) {
    console.error('Get followers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





