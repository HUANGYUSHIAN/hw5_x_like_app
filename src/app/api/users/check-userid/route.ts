import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const trimmedUserId = userId.trim()

    if (trimmedUserId.length === 0) {
      return NextResponse.json(
        { error: 'User ID cannot be empty' },
        { status: 400 }
      )
    }

    // Check if userId is already taken
    const existingUser = await prisma.user.findUnique({
      where: { userId: trimmedUserId },
      select: { userId: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { available: false, message: 'User ID is already taken' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { available: true, message: 'User ID is available' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Check userId error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

