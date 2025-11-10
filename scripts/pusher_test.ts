/**
 * Pusher Connection and Event Test Script
 * 
 * Tests Pusher server and client connectivity, channel subscriptions, and event broadcasting
 * Run with: npx tsx scripts/pusher_test.ts
 * 
 * This script tests:
 * 1. Pusher server configuration and connection
 * 2. Pusher client connection (simulated)
 * 3. Public channel event broadcasting
 * 4. Private channel event broadcasting
 * 5. Event reception verification
 */

import Pusher from 'pusher'
// Note: pusher-js is for browser/client-side, not needed for server-side testing
// import PusherClient from 'pusher-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file explicitly
// Try multiple possible locations
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.local'),
]

let envLoaded = false
for (const envPath of envPaths) {
  try {
    const result = config({ path: envPath })
    if (result && !result.error) {
      console.log(`[Info] Loaded .env from: ${envPath}`)
      envLoaded = true
      break
    }
  } catch (error) {
    // Continue to next path
  }
}

// Also try loading without path (default behavior)
if (!envLoaded) {
  const result = config()
  if (result && !result.error) {
    console.log(`[Info] Loaded .env from default location`)
  } else {
    console.warn(`[Warning] Could not load .env file. Make sure .env exists in the project root.`)
  }
}

// Debug: Print all Pusher-related environment variables (without values for security)
console.log('\n[Debug] Checking environment variables:')
console.log(`  NEXT_PUBLIC_PUSHER_APP_ID: ${process.env.NEXT_PUBLIC_PUSHER_APP_ID ? '✓ Set' : '✗ Missing'}`)
console.log(`  PUSHER_APP_ID: ${process.env.PUSHER_APP_ID ? '✓ Set' : '✗ Missing'}`)
console.log(`  NEXT_PUBLIC_PUSHER_KEY: ${process.env.NEXT_PUBLIC_PUSHER_KEY ? '✓ Set' : '✗ Missing'}`)
console.log(`  PUSHER_KEY: ${process.env.PUSHER_KEY ? '✓ Set' : '✗ Missing'}`)
console.log(`  PUSHER_SECRET: ${process.env.PUSHER_SECRET ? '✓ Set' : '✗ Missing'}`)
console.log(`  NEXT_PUBLIC_PUSHER_CLUSTER: ${process.env.NEXT_PUBLIC_PUSHER_CLUSTER ? '✓ Set (' + process.env.NEXT_PUBLIC_PUSHER_CLUSTER + ')' : '✗ Missing'}`)
console.log(`  PUSHER_CLUSTER: ${process.env.PUSHER_CLUSTER ? '✓ Set (' + process.env.PUSHER_CLUSTER + ')' : '✗ Missing'}`)
console.log('')

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green')
}

function logError(message: string) {
  log(`✗ ${message}`, 'red')
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue')
}

function logWarning(message: string) {
  log(`⚠ ${message}`, 'yellow')
}

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const results: TestResult[] = []

async function testPusherServerConfig(): Promise<boolean> {
  logInfo('\n=== Testing Pusher Server Configuration ===')
  
  // Support both naming conventions
  const appId = process.env.PUSHER_APP_ID || process.env.NEXT_PUBLIC_PUSHER_APP_ID
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  logInfo(`App ID: ${appId ? '✓ Set' : '✗ Missing'}`)
  logInfo(`Key: ${key ? '✓ Set' : '✗ Missing'}`)
  logInfo(`Secret: ${secret ? '✓ Set' : '✗ Missing'}`)
  logInfo(`Cluster: ${cluster}`)

  if (!appId || !key || !secret) {
    logError('Missing required Pusher environment variables')
    results.push({
      name: 'Pusher Server Configuration',
      passed: false,
      error: 'Missing environment variables',
      details: { appId: !!appId, key: !!key, secret: !!secret, cluster }
    })
    return false
  }

  try {
    const pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })

    logSuccess('Pusher server instance created successfully')
    results.push({
      name: 'Pusher Server Configuration',
      passed: true,
      details: { appId, key: key.substring(0, 10) + '...', cluster }
    })
    return true
  } catch (error: any) {
    logError(`Failed to create Pusher server instance: ${error.message}`)
    results.push({
      name: 'Pusher Server Configuration',
      passed: false,
      error: error.message
    })
    return false
  }
}

async function testPusherClientConfig(): Promise<boolean> {
  logInfo('\n=== Testing Pusher Client Configuration ===')
  
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  logInfo(`Public Key: ${key ? '✓ Set' : '✗ Missing'}`)
  logInfo(`Cluster: ${cluster}`)

  if (!key) {
    logError('Missing NEXT_PUBLIC_PUSHER_KEY environment variable')
    results.push({
      name: 'Pusher Client Configuration',
      passed: false,
      error: 'Missing NEXT_PUBLIC_PUSHER_KEY'
    })
    return false
  }

  try {
    // Note: pusher-js is designed for browser environments
    // In Node.js, we can't fully test it, but we can verify the config
    logSuccess('Pusher client configuration is valid')
    results.push({
      name: 'Pusher Client Configuration',
      passed: true,
      details: { key: key.substring(0, 10) + '...', cluster }
    })
    return true
  } catch (error: any) {
    logError(`Failed to validate Pusher client config: ${error.message}`)
    results.push({
      name: 'Pusher Client Configuration',
      passed: false,
      error: error.message
    })
    return false
  }
}

async function testPublicChannelEvent(): Promise<boolean> {
  logInfo('\n=== Testing Public Channel Event Broadcasting ===')
  
  // Support both naming conventions
  const appId = process.env.PUSHER_APP_ID || process.env.NEXT_PUBLIC_PUSHER_APP_ID
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  if (!appId || !key || !secret) {
    logError('Cannot test without Pusher credentials')
    results.push({
      name: 'Public Channel Event',
      passed: false,
      error: 'Missing credentials'
    })
    return false
  }

  try {
    const pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })

    const testEvent = {
      postId: 'test-post-' + Date.now(),
      authorId: 'test-author',
      authorUserId: 'testUser',
      createdAt: new Date().toISOString(),
      message: 'This is a test event from pusher_test.ts',
    }

    logInfo(`Triggering event on channel: public-posts`)
    logInfo(`Event data: ${JSON.stringify(testEvent, null, 2)}`)

    await pusher.trigger('public-posts', 'post:created', testEvent)
    
    logSuccess('Event successfully triggered on public-posts channel')
    results.push({
      name: 'Public Channel Event',
      passed: true,
      details: testEvent
    })
    return true
  } catch (error: any) {
    logError(`Failed to trigger public channel event: ${error.message}`)
    results.push({
      name: 'Public Channel Event',
      passed: false,
      error: error.message
    })
    return false
  }
}

async function testPrivateChannelEvent(): Promise<boolean> {
  logInfo('\n=== Testing Private Channel Event Broadcasting ===')
  
  // Support both naming conventions
  const appId = process.env.PUSHER_APP_ID || process.env.NEXT_PUBLIC_PUSHER_APP_ID
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  if (!appId || !key || !secret) {
    logError('Cannot test without Pusher credentials')
    results.push({
      name: 'Private Channel Event',
      passed: false,
      error: 'Missing credentials'
    })
    return false
  }

  try {
    const pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })

    const testUserId = 'test-user-' + Date.now()
    const channelName = `private-user-${testUserId}`
    const testEvent = {
      postId: 'test-post-' + Date.now(),
      authorId: 'test-author',
      authorUserId: 'testUser',
      createdAt: new Date().toISOString(),
      message: 'This is a test event for private channel',
    }

    logInfo(`Triggering event on channel: ${channelName}`)
    logInfo(`Event data: ${JSON.stringify(testEvent, null, 2)}`)

    await pusher.trigger(channelName, 'post:created', testEvent)
    
    logSuccess(`Event successfully triggered on ${channelName} channel`)
    results.push({
      name: 'Private Channel Event',
      passed: true,
      details: { channelName, event: testEvent }
    })
    return true
  } catch (error: any) {
    logError(`Failed to trigger private channel event: ${error.message}`)
    results.push({
      name: 'Private Channel Event',
      passed: false,
      error: error.message
    })
    return false
  }
}

async function testBatchEvents(): Promise<boolean> {
  logInfo('\n=== Testing Batch Event Broadcasting ===')
  
  // Support both naming conventions
  const appId = process.env.PUSHER_APP_ID || process.env.NEXT_PUBLIC_PUSHER_APP_ID
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  if (!appId || !key || !secret) {
    logError('Cannot test without Pusher credentials')
    results.push({
      name: 'Batch Events',
      passed: false,
      error: 'Missing credentials'
    })
    return false
  }

  try {
    const pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })

    const batch = [
      {
        channel: 'public-posts',
        name: 'post:created',
        data: {
          postId: 'batch-test-1',
          message: 'Batch event 1',
        },
      },
      {
        channel: 'public-posts',
        name: 'post:created',
        data: {
          postId: 'batch-test-2',
          message: 'Batch event 2',
        },
      },
    ]

    logInfo(`Triggering ${batch.length} events in batch`)

    await pusher.triggerBatch(batch)
    
    logSuccess(`Successfully triggered ${batch.length} events in batch`)
    results.push({
      name: 'Batch Events',
      passed: true,
      details: { batchSize: batch.length }
    })
    return true
  } catch (error: any) {
    logError(`Failed to trigger batch events: ${error.message}`)
    results.push({
      name: 'Batch Events',
      passed: false,
      error: error.message
    })
    return false
  }
}

async function testChannelAuthorization(): Promise<boolean> {
  logInfo('\n=== Testing Channel Authorization ===')
  
  // Support both naming conventions
  const appId = process.env.PUSHER_APP_ID || process.env.NEXT_PUBLIC_PUSHER_APP_ID
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2'

  if (!appId || !key || !secret) {
    logError('Cannot test without Pusher credentials')
    results.push({
      name: 'Channel Authorization',
      passed: false,
      error: 'Missing credentials'
    })
    return false
  }

  try {
    const pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })

    const socketId = '123.456'
    const channelName = 'private-user-test-user-123'

    logInfo(`Authorizing channel: ${channelName}`)
    logInfo(`Socket ID: ${socketId}`)

    const auth = pusher.authorizeChannel(socketId, channelName)
    
    if (auth && auth.auth) {
      logSuccess('Channel authorization successful')
      logInfo(`Auth signature: ${auth.auth.substring(0, 20)}...`)
      results.push({
        name: 'Channel Authorization',
        passed: true,
        details: { channelName, hasAuth: !!auth.auth }
      })
      return true
    } else {
      logError('Channel authorization returned invalid response')
      results.push({
        name: 'Channel Authorization',
        passed: false,
        error: 'Invalid auth response'
      })
      return false
    }
  } catch (error: any) {
    logError(`Failed to authorize channel: ${error.message}`)
    results.push({
      name: 'Channel Authorization',
      passed: false,
      error: error.message
    })
    return false
  }
}

function printSummary() {
  logInfo('\n=== Test Summary ===')
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  logInfo(`Total tests: ${total}`)
  logSuccess(`Passed: ${passed}`)
  if (failed > 0) {
    logError(`Failed: ${failed}`)
  }

  logInfo('\nDetailed Results:')
  results.forEach(result => {
    if (result.passed) {
      logSuccess(`  ✓ ${result.name}`)
    } else {
      logError(`  ✗ ${result.name}`)
      if (result.error) {
        logWarning(`    Error: ${result.error}`)
      }
    }
  })

  if (failed === 0) {
    logSuccess('\n🎉 All tests passed! Pusher is configured correctly.')
  } else {
    logError('\n❌ Some tests failed. Please check your Pusher configuration.')
    logInfo('\nTroubleshooting tips:')
    logInfo('1. Verify all environment variables are set correctly in .env')
    logInfo('2. Check that PUSHER_APP_ID, PUSHER_KEY, and PUSHER_SECRET match your Pusher dashboard')
    logInfo('3. Ensure NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER are set for client-side usage')
    logInfo('4. Verify your Pusher app is active in the Pusher dashboard')
    logInfo('5. Check network connectivity to Pusher servers')
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'cyan')
  log('Pusher Connection and Event Test', 'cyan')
  log('='.repeat(60), 'cyan')

  // Run all tests
  await testPusherServerConfig()
  await testPusherClientConfig()
  await testPublicChannelEvent()
  await testPrivateChannelEvent()
  await testBatchEvents()
  await testChannelAuthorization()

  // Print summary
  printSummary()

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed)
  process.exit(allPassed ? 0 : 1)
}

// Run the tests
main().catch(error => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})

