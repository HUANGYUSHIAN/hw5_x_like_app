/**
 * Database Seeding Script
 * 
 * This script creates test data for local development and testing.
 * 
 * Usage:
 *   tsx test/scripts/seed-db.ts
 *   or
 *   node --loader ts-node/esm test/scripts/seed-db.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { userId: 'testuser1' },
    update: {},
    create: {
      userId: 'testuser1',
      name: 'Test User 1',
      email: 'test1@example.com',
      bio: 'This is a test user',
      provider: 'local',
      providerId: 'local-testuser1',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { userId: 'testuser2' },
    update: {},
    create: {
      userId: 'testuser2',
      name: 'Test User 2',
      email: 'test2@example.com',
      bio: 'Another test user',
      provider: 'local',
      providerId: 'local-testuser2',
    },
  })

  console.log('✅ Created users:', { user1: user1.userId, user2: user2.userId })

  // Create test posts
  const post1 = await prisma.post.create({
    data: {
      authorId: user1.id,
      content: 'This is a test post #test #example',
    },
  })

  const post2 = await prisma.post.create({
    data: {
      authorId: user2.id,
      content: 'Hello @testuser1! Check out https://example.com',
    },
  })

  const post3 = await prisma.post.create({
    data: {
      authorId: user1.id,
      content: 'Another post with mentions @testuser2',
    },
  })

  console.log('✅ Created posts:', { post1: post1.id, post2: post2.id, post3: post3.id })

  // Create test comments
  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorId: user2.id,
      content: 'This is a test comment',
    },
  })

  console.log('✅ Created comment:', comment1.id)

  // Create test likes
  await prisma.like.create({
    data: {
      userId: user2.id,
      postId: post1.id,
    },
  })

  console.log('✅ Created like')

  // Create test follow relationship
  await prisma.follow.create({
    data: {
      followerId: user2.id,
      followingId: user1.id,
    },
  })

  console.log('✅ Created follow relationship')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })











