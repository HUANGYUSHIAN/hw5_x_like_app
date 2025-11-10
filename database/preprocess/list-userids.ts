/**
 * 列出数据库中所有 userID 的脚本
 * 
 * 使用方法：
 *   npx tsx database/preprocess/list-userids.ts
 *   或
 *   npm run db:list-ids
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function listUserIds() {
  console.log('📋 正在查询数据库中的所有 userID...\n')

  // 检查环境变量
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 未设置')
    console.error('💡 请确保环境变量 DATABASE_URL 已正确配置')
    process.exit(1)
  }

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
    // 查询所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        provider: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const totalCount = users.length

    if (totalCount === 0) {
      console.log('📭 数据库中没有用户')
      return
    }

    console.log(`📊 总共找到 ${totalCount} 个用户:\n`)
    console.log('─'.repeat(80))
    console.log(
      `${'序号'.padEnd(6)}${'userID'.padEnd(20)}${'名称'.padEnd(20)}${'Email'.padEnd(30)}${'Provider'.padEnd(10)}`
    )
    console.log('─'.repeat(80))

    users.forEach((user, index) => {
      const userId = user.userId || '(未设置)'
      const name = (user.name || '').substring(0, 18).padEnd(20)
      const email = (user.email || '(无)').substring(0, 28).padEnd(30)
      const provider = (user.provider || '').padEnd(10)
      const number = `${index + 1}.`.padEnd(6)

      console.log(`${number}${userId.padEnd(20)}${name}${email}${provider}`)
    })

    console.log('─'.repeat(80))
    console.log(`\n📋 所有 userID 列表 (共 ${totalCount} 个):\n`)

    // 只列出 userID，方便复制
    const userIds = users.map((u, i) => {
      const userId = u.userId || '(未设置)'
      return `  ${i + 1}. ${userId}`
    })
    console.log(userIds.join('\n'))

    // 生成 JSON 格式，方便复制到 protected-userids.json
    console.log('\n📋 JSON 格式 (可直接复制到 protected-userids.json):\n')
    const validUserIds = users
      .map(u => u.userId)
      .filter((id): id is string => !!id && id.trim() !== '')
    
    if (validUserIds.length > 0) {
      const jsonOutput = JSON.stringify(
        {
          protectedUserIds: validUserIds,
          description: '填入要保留的 userID 列表。部署到 Vercel 时，除了这些 userID 之外的所有用户及其相关数据都会被删除。',
        },
        null,
        2
      )
      console.log(jsonOutput)
    } else {
      console.log('⚠️  没有有效的 userID（所有用户的 userID 都为空）')
    }

    // 统计信息
    console.log('\n📊 统计信息:')
    console.log(`   - 总用户数: ${totalCount}`)
    console.log(`   - 有效 userID: ${validUserIds.length}`)
    console.log(`   - 无效/空 userID: ${totalCount - validUserIds.length}`)

    // 按 provider 统计
    const providerStats = users.reduce((acc, user) => {
      const provider = user.provider || 'unknown'
      acc[provider] = (acc[provider] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    if (Object.keys(providerStats).length > 0) {
      console.log('\n📊 按登录方式统计:')
      Object.entries(providerStats).forEach(([provider, count]) => {
        console.log(`   - ${provider}: ${count}`)
      })
    }

  } catch (error: any) {
    console.error('❌ 查询用户时出错:', error.message)
    console.error(error)
    throw error
  }
}

// 运行脚本
listUserIds()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

