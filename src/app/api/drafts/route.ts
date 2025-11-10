import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { draftSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const user = await prisma.user.findUnique({
      where: { id: session.user?.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const drafts = await prisma.draft.findMany({
      where: { authorId: user.id },
      include: {
        author: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(drafts)
  } catch (error) {
    console.error('Get drafts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    const body = await request.json()
    const validated = draftSchema.parse(body)
    const draftId = body.id // Optional: update existing draft

    const user = await prisma.user.findUnique({
      where: { id: session.user?.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let draft

    if (draftId) {
      // Update existing draft
      draft = await prisma.draft.update({
        where: { id: draftId },
        data: {
          content: validated.content,
        },
        include: {
          author: true,
        },
      })
    } else {
      // Create new draft
      draft = await prisma.draft.create({
        data: {
          authorId: user.id,
          content: validated.content,
        },
        include: {
          author: true,
        },
      })
    }

    return NextResponse.json(draft, { status: draftId ? 200 : 201 })
  } catch (error) {
    console.error('Create/update draft error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

