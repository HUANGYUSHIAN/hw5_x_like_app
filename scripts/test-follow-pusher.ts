/**
 * Follow and Pusher Test Script
 * 
 * Tests follow functionality and Pusher real-time updates
 * Run with: npm run test-follow-pusher
 * 
 * This script simulates:
 * 1. User B and C follow User A
 * 2. User A creates a post
 * 3. Verifies Pusher events are triggered
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

interface UserSession {
  userId: string
  name: string
  cookie: string
  userId_db: string // Database user ID
}

async function login(userId: string, name: string): Promise<UserSession | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, name }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Login failed for ${userId}:`, error.error || error)
      return null
    }

    const data = await response.json()
    
    // Get cookie from response
    const cookies = response.headers.get('set-cookie')
    let cookie = ''
    if (cookies) {
      const match = cookies.match(/local-auth-token=([^;]+)/)
      if (match) {
        cookie = match[1]
      }
    }

    return {
      userId,
      name,
      cookie,
      userId_db: data.user.id,
    }
  } catch (error: any) {
    console.error(`  ✗ Login error for ${userId}:`, error.message)
    return null
  }
}

async function followUser(followerSession: UserSession, followingUserId: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/users/${followingUserId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `local-auth-token=${followerSession.cookie}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Follow failed:`, error.error || error)
      return false
    }

    const data = await response.json()
    console.log(`  ✓ ${followerSession.userId} ${data.following ? 'followed' : 'unfollowed'} ${followingUserId}`)
    return true
  } catch (error: any) {
    console.error(`  ✗ Follow error:`, error.message)
    return false
  }
}

async function createPost(session: UserSession, content: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `local-auth-token=${session.cookie}`,
      },
      body: JSON.stringify({ content }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Create post failed:`, error.error || error)
      return null
    }

    const post = await response.json()
    console.log(`  ✓ Post created: ${post.id.substring(0, 8)}...`)
    return post.id
  } catch (error: any) {
    console.error(`  ✗ Create post error:`, error.message)
    return null
  }
}

async function getFollowingPosts(session: UserSession): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/posts?filter=following&limit=10`, {
      method: 'GET',
      headers: {
        'Cookie': `local-auth-token=${session.cookie}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Fetch following posts failed:`, error.error || error)
      return []
    }

    const data = await response.json()
    return data.items || []
  } catch (error: any) {
    console.error(`  ✗ Fetch following posts error:`, error.message)
    return []
  }
}

async function verifyFollows(followerId: string, followingId: string): Promise<boolean> {
  try {
    const follow = await prisma.follow.findFirst({
      where: {
        follower: { userId: followerId },
        following: { userId: followingId },
      },
    })
    return !!follow
  } catch (error) {
    return false
  }
}

async function main() {
  console.log('🧪 Follow and Pusher Test\n')
  console.log('=' .repeat(50))
  console.log('')

  try {
    // Step 1: Login all users
    console.log('🔐 Logging in users...\n')
    const userA = await login('userA', 'User A')
    if (!userA) {
      console.error('❌ Failed to login userA')
      process.exit(1)
    }
    console.log(`  ✓ User A logged in`)

    const userB = await login('userB', 'User B')
    if (!userB) {
      console.error('❌ Failed to login userB')
      process.exit(1)
    }
    console.log(`  ✓ User B logged in`)

    const userC = await login('userC', 'User C')
    if (!userC) {
      console.error('❌ Failed to login userC')
      process.exit(1)
    }
    console.log(`  ✓ User C logged in`)
    console.log('')

    // Step 2: User B and C follow User A
    console.log('👥 Setting up follows...\n')
    
    const bFollowsA = await followUser(userB, 'userA')
    if (!bFollowsA) {
      console.error('❌ User B failed to follow User A')
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const cFollowsA = await followUser(userC, 'userA')
    if (!cFollowsA) {
      console.error('❌ User C failed to follow User A')
    }
    
    console.log('')

    // Step 3: Verify follows in database
    console.log('🔍 Verifying follows in database...\n')
    const bFollowsA_db = await verifyFollows('userB', 'userA')
    const cFollowsA_db = await verifyFollows('userC', 'userA')
    
    if (bFollowsA_db) {
      console.log('  ✓ User B follows User A (verified in DB)')
    } else {
      console.error('  ✗ User B does not follow User A in DB')
    }
    
    if (cFollowsA_db) {
      console.log('  ✓ User C follows User A (verified in DB)')
    } else {
      console.error('  ✗ User C does not follow User A in DB')
    }
    console.log('')

    // Step 4: User A creates a post
    console.log('📝 User A creating a post...\n')
    const postContent = `Test post from User A at ${new Date().toISOString()}`
    const postId = await createPost(userA, postContent)
    
    if (!postId) {
      console.error('❌ Failed to create post')
      process.exit(1)
    }
    console.log('')

    // Step 5: Wait a moment for Pusher to propagate
    console.log('⏳ Waiting for Pusher events to propagate...\n')
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('')

    // Step 6: User B and C check their following feed
    console.log('📰 Checking following feeds...\n')
    
    const bPosts = await getFollowingPosts(userB)
    const bHasPost = bPosts.some((p: any) => p.id === postId || p.content === postContent)
    if (bHasPost) {
      console.log(`  ✓ User B sees the new post (${bPosts.length} posts in feed)`)
    } else {
      console.warn(`  ⚠️  User B does not see the new post (${bPosts.length} posts in feed)`)
    }
    
    const cPosts = await getFollowingPosts(userC)
    const cHasPost = cPosts.some((p: any) => p.id === postId || p.content === postContent)
    if (cHasPost) {
      console.log(`  ✓ User C sees the new post (${cPosts.length} posts in feed)`)
    } else {
      console.warn(`  ⚠️  User C does not see the new post (${cPosts.length} posts in feed)`)
    }
    console.log('')

    // Step 7: Summary
    console.log('=' .repeat(50))
    console.log('\n📊 Test Summary:\n')
    console.log(`  Follows: ${bFollowsA_db && cFollowsA_db ? '✅' : '❌'}`)
    console.log(`  Post Created: ${postId ? '✅' : '❌'}`)
    console.log(`  User B sees post: ${bHasPost ? '✅' : '⚠️'}`)
    console.log(`  User C sees post: ${cHasPost ? '✅' : '⚠️'}`)
    console.log('')
    console.log('💡 Note: Pusher real-time updates require active WebSocket connections.')
    console.log('   This script tests the API endpoints. For full real-time testing,')
    console.log('   open multiple browser tabs and test manually.')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()








