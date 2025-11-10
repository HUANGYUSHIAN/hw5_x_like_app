import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params
    const session = await getSession(request).catch(() => null)
    const currentUserId = session?.user?.id

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Get comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




