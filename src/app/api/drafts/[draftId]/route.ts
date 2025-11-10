import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { draftId } = await params

    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (draft.authorId !== session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.draft.delete({
      where: { id: draftId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

