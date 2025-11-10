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

    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: true,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    })

    const hasMore = following.length > limit
    const items = hasMore ? following.slice(0, limit) : following

    return NextResponse.json({
      items: items.map(f => f.following),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error) {
    console.error('Get following error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





