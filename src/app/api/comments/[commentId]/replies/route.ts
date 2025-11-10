import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    const replies = await prisma.comment.findMany({
      where: {
        parentId: commentId,
      },
      include: {
        author: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'asc' },
    })

    const hasMore = replies.length > limit
    const items = hasMore ? replies.slice(0, limit) : replies

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error) {
    console.error('Get replies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




