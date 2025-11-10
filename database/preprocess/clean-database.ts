/**
 * 数据库清理脚本
 * 
 * 在部署到 Vercel 之前清理数据库，只保留指定的 userID
 * 
 * 使用方法：
 *   npx tsx database/preprocess/clean-database.ts
 *   或
 *   npm run db:clean
 * 
 * 注意：
 *   - 此脚本会删除所有不在保护列表中的用户及其相关数据
 *   - 请确保在 database/preprocess/protected-userids.json 中正确配置要保留的 userID
 *   - 建议在运行前备份数据库
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

interface ProtectedUserIdsConfig {
  protectedUserIds: string[]
  description?: string
}

async function loadProtectedUserIds(): Promise<string[]> {
  try {
    const configPath = join(process.cwd(), 'database', 'preprocess', 'protected-userids.json')
    const configContent = readFileSync(configPath, 'utf-8')
    const config: ProtectedUserIdsConfig = JSON.parse(configContent)
    
    if (!Array.isArray(config.protectedUserIds)) {
      throw new Error('protectedUserIds 必须是数组')
    }
    
    return config.protectedUserIds.filter(id => id && typeof id === 'string' && id.trim() !== '')
  } catch (error: any) {
    console.error('❌ 读取保护列表失败:', error.message)
    console.error('💡 请确保 database/preprocess/protected-userids.json 文件存在且格式正确')
    process.exit(1)
  }
}

async function cleanDatabase() {
  console.log('🧹 开始清理数据库...\n')

  // 检查环境变量
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 未设置')
    console.error('💡 请确保环境变量 DATABASE_URL 已正确配置')
    process.exit(1)
  }

  // 加载保护列表
  const protectedUserIds = await loadProtectedUserIds()
  
  if (protectedUserIds.length === 0) {
    console.error('❌ 保护列表为空！')
    console.error('💡 请在 database/preprocess/protected-userids.json 中至少添加一个要保留的 userID')
    process.exit(1)
  }
  
  console.log(`📋 保护列表 (${protectedUserIds.length} 个 userID):`)
  protectedUserIds.forEach((id, index) => {
    console.log(`   ${index + 1}. ${id}`)
  })
  console.log('')

  // 连接数据库
  try {
    await prisma.$connect()
    console.log('✅ 已连接到数据库\n')
  } catch (error: any) {
    console.error('❌ 无法连接到数据库:', error.message)
    console.error('\n💡 请检查：')
    console.error('  1. DATABASE_URL 是否正确设置')
    console.error('  2. MongoDB Atlas IP 白名单设置')
    console.error('  3. 网络连接是否正常')
    process.exit(1)
  }

  try {
    // 1. 查找所有要保留的用户
    const protectedUsers = await prisma.user.findMany({
      where: {
        userId: {
          in: protectedUserIds,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    })

    const protectedUserIds_set = new Set(protectedUsers.map(u => u.id))

    console.log(`✅ 找到 ${protectedUsers.length} 个受保护的用户:`)
    protectedUsers.forEach((user) => {
      console.log(`   - ${user.userId} (MongoDB ID: ${user.id})`)
    })
    console.log('')

    // 2. 查找所有要删除的用户
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        userId: true,
      },
    })

    const usersToDelete = allUsers.filter(u => !protectedUserIds_set.has(u.id))
    
    if (usersToDelete.length === 0) {
      console.log('✅ 没有需要删除的用户，数据库已经是干净状态')
      return
    }

    console.log(`⚠️  找到 ${usersToDelete.length} 个需要删除的用户:`)
    usersToDelete.forEach((user) => {
      console.log(`   - ${user.userId} (MongoDB ID: ${user.id})`)
    })
    console.log('')

    // 确认操作（在生产环境跳过确认，直接执行）
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
    
    if (!isProduction) {
      console.log('⚠️  警告：此操作将删除上述用户及其所有相关数据！')
      console.log('💡 如果这是生产环境，请设置 NODE_ENV=production 或 VERCEL=1 以跳过确认')
      console.log('')
    }

    // 3. 删除相关数据（按依赖关系顺序）
    const userIdsToDelete = usersToDelete.map(u => u.id)
    
    console.log('🗑️  开始删除相关数据...\n')

    // 删除消息（Messages）
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: { in: userIdsToDelete } },
          { receiverId: { in: userIdsToDelete } },
        ],
      },
    })
    console.log(`   ✓ 删除 ${deletedMessages.count} 条消息`)

    // 删除通知（Notifications）
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId: { in: userIdsToDelete } },
          { actorId: { in: userIdsToDelete } },
        ],
      },
    })
    console.log(`   ✓ 删除 ${deletedNotifications.count} 条通知`)

    // 删除草稿（Drafts）
    const deletedDrafts = await prisma.draft.deleteMany({
      where: {
        authorId: { in: userIdsToDelete },
      },
    })
    console.log(`   ✓ 删除 ${deletedDrafts.count} 个草稿`)

    // 删除转发（Reposts）
    const deletedReposts = await prisma.repost.deleteMany({
      where: {
        userId: { in: userIdsToDelete },
      },
    })
    console.log(`   ✓ 删除 ${deletedReposts.count} 条转发`)

    // 删除点赞（Likes）
    const deletedLikes = await prisma.like.deleteMany({
      where: {
        userId: { in: userIdsToDelete },
      },
    })
    console.log(`   ✓ 删除 ${deletedLikes.count} 个点赞`)

    // 删除关注关系（Follows）
    const deletedFollows = await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: { in: userIdsToDelete } },
          { followingId: { in: userIdsToDelete } },
        ],
      },
    })
    console.log(`   ✓ 删除 ${deletedFollows.count} 个关注关系`)

    // 删除评论（Comments）- 需要先删除子评论
    const deletedComments = await prisma.comment.deleteMany({
      where: {
        authorId: { in: userIdsToDelete },
      },
    })
    console.log(`   ✓ 删除 ${deletedComments.count} 条评论`)

    // 删除帖子（Posts）- 需要先删除相关的 likes, comments, reposts
    const deletedPosts = await prisma.post.deleteMany({
      where: {
        authorId: { in: userIdsToDelete },
      },
    })
    console.log(`   ✓ 删除 ${deletedPosts.count} 篇帖子`)

    // 4. 最后删除用户
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: userIdsToDelete },
      },
    })
    console.log(`   ✓ 删除 ${deletedUsers.count} 个用户`)

    console.log('\n✨ 数据库清理完成！')
    console.log(`\n📊 清理统计:`)
    console.log(`   - 保留用户: ${protectedUsers.length}`)
    console.log(`   - 删除用户: ${deletedUsers.count}`)
    console.log(`   - 删除帖子: ${deletedPosts.count}`)
    console.log(`   - 删除评论: ${deletedComments.count}`)
    console.log(`   - 删除点赞: ${deletedLikes.count}`)
    console.log(`   - 删除转发: ${deletedReposts.count}`)
    console.log(`   - 删除关注: ${deletedFollows.count}`)
    console.log(`   - 删除草稿: ${deletedDrafts.count}`)
    console.log(`   - 删除通知: ${deletedNotifications.count}`)
    console.log(`   - 删除消息: ${deletedMessages.count}`)

  } catch (error: any) {
    console.error('❌ 清理数据库时出错:', error.message)
    console.error(error)
    throw error
  }
}

// 运行清理脚本
cleanDatabase()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

