import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { userUpdateSchema, userIdSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Get user error:', error)
    
    // Handle MongoDB connection errors
    if (error.message?.includes('Server selection timeout') || 
        error.message?.includes('timed out') ||
        error.message?.includes('I/O error')) {
      return NextResponse.json(
        { 
          error: 'Database connection timeout',
          message: 'Unable to connect to database. Please check your connection settings.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAuth(request)
    const { userId: pathUserId } = await params

    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use session user id to find the user (more reliable than userId which can change)
    // This ensures we can update the user even if userId is being changed
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify that the path userId matches the current user's userId
    // (unless they're updating it, which is allowed)
    const body = await request.json()
    const validated = userUpdateSchema.parse(body)
    
    // If userId is not being updated, verify path matches current userId
    if (!validated.userId || validated.userId === user.userId) {
      if (pathUserId !== user.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Prepare update data, converting empty strings to null
    const updateData: any = {}
    
    // Handle userId update (with uniqueness check)
    if (validated.userId !== undefined && validated.userId !== user.userId) {
      // Check if new userId is already taken
      const existingUser = await prisma.user.findUnique({
        where: { userId: validated.userId },
      })
      
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'User ID already taken', message: 'This user ID is already in use' },
          { status: 409 }
        )
      }
      
      updateData.userId = validated.userId
    }
    
    if (validated.name !== undefined) updateData.name = validated.name
    // email 不允许修改（OAuth 绑定）
    // if (validated.email !== undefined) updateData.email = validated.email || null
    if (validated.bio !== undefined) updateData.bio = validated.bio || null
    if (validated.avatarUrl !== undefined) updateData.avatarUrl = validated.avatarUrl || null
    if (validated.backgroundUrl !== undefined) updateData.backgroundUrl = validated.backgroundUrl || null

    // Always use user id (MongoDB ObjectID) to update, not userId which can change
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })

    // If userId was changed, return the new userId in response
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

