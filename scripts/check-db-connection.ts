/**
 * MongoDB Connection Diagnostic Script
 * 
 * This script helps diagnose MongoDB Atlas connection issues.
 * Run with: npx tsx scripts/check-db-connection.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function checkConnection() {
  console.log('🔍 Checking MongoDB connection...\n')

  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables')
    console.log('💡 Add DATABASE_URL to your .env or .env.local file')
    process.exit(1)
  }

  // Check if connection string has timeout parameters
  const hasTimeoutParams = 
    dbUrl.includes('serverSelectionTimeoutMS') || 
    dbUrl.includes('connectTimeoutMS')
  
  if (!hasTimeoutParams) {
    console.warn('⚠️  DATABASE_URL does not include timeout parameters')
    console.log('💡 Recommended: Add ?serverSelectionTimeoutMS=10000&connectTimeoutMS=10000 to your connection string')
  } else {
    console.log('✅ Connection string includes timeout parameters')
  }

  // Check if connection string has retry parameters
  const hasRetryParams = dbUrl.includes('retryWrites=true')
  if (!hasRetryParams) {
    console.warn('⚠️  DATABASE_URL does not include retryWrites parameter')
    console.log('💡 Recommended: Add ?retryWrites=true&w=majority to your connection string')
  } else {
    console.log('✅ Connection string includes retry parameters')
  }

  console.log('\n🔌 Attempting to connect to MongoDB...\n')

  try {
    // Try to connect
    await prisma.$connect()
    console.log('✅ Successfully connected to MongoDB!')

    // Try a simple query
    const userCount = await prisma.user.count()
    console.log(`✅ Database is accessible (found ${userCount} users)`)

    // Check if tables exist
    try {
      await prisma.post.count()
      console.log('✅ Posts collection exists')
    } catch (e) {
      console.warn('⚠️  Posts collection may not exist yet. Run: npm run db:push')
    }

    console.log('\n✅ All checks passed! Your MongoDB connection is working correctly.')
  } catch (error: any) {
    console.error('\n❌ Connection failed!\n')
    console.error('Error details:')
    console.error('  Message:', error.message)
    
    if (error.message?.includes('Server selection timeout') || 
        error.message?.includes('timed out') ||
        error.message?.includes('I/O error')) {
      console.error('\n🔴 This is a connection timeout error.\n')
      console.error('Possible causes:')
      console.error('  1. MongoDB Atlas IP whitelist does not include your IP address')
      console.error('     → Go to MongoDB Atlas → Network Access → Add IP Address')
      console.error('     → For development, you can use 0.0.0.0/0 (allows all IPs)')
      console.error('  2. MongoDB Atlas cluster is paused or not running')
      console.error('     → Go to MongoDB Atlas → Clusters → Check cluster status')
      console.error('  3. Network connectivity issues')
      console.error('     → Check your internet connection')
      console.error('     → Check if firewall is blocking the connection')
      console.error('  4. Connection string is incorrect')
      console.error('     → Verify username, password, and cluster URL in DATABASE_URL')
    } else if (error.message?.includes('authentication failed') || 
               error.message?.includes('bad auth')) {
      console.error('\n🔴 This is an authentication error.\n')
      console.error('Possible causes:')
      console.error('  1. Incorrect username or password in DATABASE_URL')
      console.error('     → Check your MongoDB Atlas Database Access credentials')
      console.error('  2. User does not have proper permissions')
      console.error('     → Ensure the user has read/write permissions')
    } else if (error.message?.includes('ENOTFOUND') || 
               error.message?.includes('getaddrinfo')) {
      console.error('\n🔴 This is a DNS resolution error.\n')
      console.error('Possible causes:')
      console.error('  1. Incorrect cluster URL in DATABASE_URL')
      console.error('     → Verify the cluster URL in MongoDB Atlas')
      console.error('  2. Network connectivity issues')
      console.error('     → Check your internet connection')
    } else {
      console.error('\n🔴 Unknown error. Please check the error message above.')
    }

    console.error('\n💡 Troubleshooting steps:')
    console.error('  1. Verify DATABASE_URL in .env or .env.local')
    console.error('  2. Check MongoDB Atlas Network Access settings')
    console.error('  3. Check MongoDB Atlas cluster status')
    console.error('  4. Try connecting from MongoDB Atlas web interface')
    console.error('  5. Check docs/local-setup.md for detailed setup instructions')

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkConnection()








