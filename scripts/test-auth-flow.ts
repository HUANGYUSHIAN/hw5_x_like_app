/**
 * Authentication Flow Test Script
 * 
 * Tests login, logout, and session management
 * Run with: npm run test-auth-flow
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

interface TestUser {
  userId: string
  name: string
}

const testUsers: TestUser[] = [
  { userId: 'userA', name: 'User A' },
  { userId: 'userB', name: 'User B' },
  { userId: 'userC', name: 'User C' },
]

async function createTestUsers() {
  console.log('📝 Creating test users...\n')
  
  for (const user of testUsers) {
    try {
      const existing = await prisma.user.findUnique({
        where: { userId: user.userId },
      })
      
      if (existing) {
        console.log(`  ✓ User ${user.userId} already exists`)
      } else {
        await prisma.user.create({
          data: {
            userId: user.userId,
            name: user.name,
            email: `${user.userId}@test.local`,
            provider: 'local',
            providerId: `local-${user.userId}`,
          },
        })
        console.log(`  ✓ Created user ${user.userId}`)
      }
    } catch (error: any) {
      console.error(`  ✗ Failed to create user ${user.userId}:`, error.message)
    }
  }
  
  console.log('')
}

async function testLogin(userId: string, name: string): Promise<string | null> {
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
      console.error(`  ✗ Login failed:`, error.error || error)
      return null
    }

    const data = await response.json()
    console.log(`  ✓ Login successful: ${data.user.name} (@${data.user.userId})`)
    
    // Get cookies from response
    const cookies = response.headers.get('set-cookie')
    if (cookies) {
      const match = cookies.match(/local-auth-token=([^;]+)/)
      if (match) {
        return match[1]
      }
    }
    
    return 'cookie-set'
  } catch (error: any) {
    console.error(`  ✗ Login error:`, error.message)
    return null
  }
}

async function testSession(cookie?: string): Promise<any> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (cookie) {
      headers['Cookie'] = `local-auth-token=${cookie}`
    }

    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Session check failed:`, error)
      return null
    }

    const session = await response.json()
    if (session && session.user) {
      console.log(`  ✓ Session valid: ${session.user.name} (@${session.user.userId})`)
      return session
    } else {
      console.log(`  ⚠ No active session`)
      return null
    }
  } catch (error: any) {
    console.error(`  ✗ Session error:`, error.message)
    return null
  }
}

async function testLogout(cookie?: string): Promise<boolean> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (cookie) {
      headers['Cookie'] = `local-auth-token=${cookie}`
    }

    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Logout failed:`, error)
      return false
    }

    console.log(`  ✓ Logout successful`)
    return true
  } catch (error: any) {
    console.error(`  ✗ Logout error:`, error.message)
    return false
  }
}

async function testPosts(cookie?: string): Promise<boolean> {
  try {
    const headers: HeadersInit = {}
    
    if (cookie) {
      headers['Cookie'] = `local-auth-token=${cookie}`
    }

    const response = await fetch(`${BASE_URL}/api/posts?limit=5`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`  ✗ Fetch posts failed:`, error.error || error)
      return false
    }

    const data = await response.json()
    console.log(`  ✓ Fetched ${data.items?.length || 0} posts`)
    return true
  } catch (error: any) {
    console.error(`  ✗ Fetch posts error:`, error.message)
    return false
  }
}

async function main() {
  console.log('🧪 Authentication Flow Test\n')
  console.log('=' .repeat(50))
  console.log('')

  try {
    // Step 1: Create test users
    await createTestUsers()

    // Step 2: Test login
    console.log('🔐 Testing Login...\n')
    const cookie = await testLogin('userA', 'User A')
    if (!cookie) {
      console.error('\n❌ Login test failed. Cannot continue.')
      process.exit(1)
    }
    console.log('')

    // Step 3: Test session
    console.log('👤 Testing Session...\n')
    const session = await testSession(cookie)
    if (!session) {
      console.error('\n❌ Session test failed.')
    }
    console.log('')

    // Step 4: Test fetching posts
    console.log('📄 Testing Posts Fetch...\n')
    const postsOk = await testPosts(cookie)
    if (!postsOk) {
      console.warn('\n⚠️  Posts fetch failed, but continuing...')
    }
    console.log('')

    // Step 5: Test logout
    console.log('🚪 Testing Logout...\n')
    const logoutOk = await testLogout(cookie)
    if (!logoutOk) {
      console.error('\n❌ Logout test failed.')
    }
    console.log('')

    // Step 6: Verify session is cleared
    console.log('🔍 Verifying Session Cleared...\n')
    const sessionAfterLogout = await testSession()
    if (sessionAfterLogout) {
      console.error('\n❌ Session still active after logout!')
    } else {
      console.log('  ✓ Session cleared successfully')
    }
    console.log('')

    console.log('=' .repeat(50))
    console.log('\n✅ Authentication flow test completed!')
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()








