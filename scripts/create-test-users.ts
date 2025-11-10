/**
 * 創建測試用戶腳本
 * 
 * 用於快速創建測試用戶，方便多標籤頁測試
 * 
 * 使用方法：
 *   npx tsx scripts/create-test-users.ts
 *   或
 *   node --loader tsx/esm scripts/create-test-users.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

const testUsers = [
  {
    userId: 'userA',
    name: 'User A',
    email: 'usera@test.com',
    bio: '這是測試用戶 A，主要用於發文測試',
  },
  {
    userId: 'userB',
    name: 'User B',
    email: 'userb@test.com',
    bio: '這是測試用戶 B，用於追蹤和互動測試',
  },
  {
    userId: 'userC',
    name: 'User C',
    email: 'userc@test.com',
    bio: '這是測試用戶 C，用於多用戶即時更新測試',
  },
  {
    userId: 'testuser1',
    name: 'Test User 1',
    email: 'testuser1@test.com',
    bio: '測試用戶 1',
  },
  {
    userId: 'testuser2',
    name: 'Test User 2',
    email: 'testuser2@test.com',
    bio: '測試用戶 2',
  },
]

async function createTestUsers() {
  console.log('🔧 開始創建測試用戶...\n')

  // 先連接資料庫
  try {
    await prisma.$connect()
    console.log('✅ 已連接到資料庫\n')
  } catch (error: any) {
    console.error('❌ 無法連接到資料庫:', error.message)
    console.error('\n💡 請檢查：')
    console.error('  1. DATABASE_URL 是否正確設置')
    console.error('  2. MongoDB Atlas IP 白名單設置')
    console.error('  3. 網路連接是否正常')
    console.error('\n運行 npm run check-db 進行診斷')
    process.exit(1)
  }

  for (const userData of testUsers) {
    try {
      // 檢查 userId 是否已存在（userId 是 unique）
      const existingUser = await prisma.user.findUnique({
        where: { userId: userData.userId },
      })
      
      // 如果 userId 不存在，檢查 email + provider 是否已存在
      if (!existingUser && userData.email) {
        const existingByEmail = await prisma.user.findFirst({
          where: {
            email: userData.email,
            provider: 'local', // 測試用戶使用 local provider
          },
        })
        if (existingByEmail) {
          console.log(`⚠️  用戶 ${userData.userId} 的 email ${userData.email} 已被使用（local provider），跳過`)
          continue
        }
      }

      if (existingUser) {
        console.log(`⚠️  用戶 ${userData.userId} 或 ${userData.email} 已存在，跳過`)
        continue
      }

      const user = await prisma.user.create({
        data: {
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          bio: userData.bio,
          provider: 'local',
          providerId: `local-${userData.userId}`,
        },
      })

      console.log(`✅ 創建用戶: ${userData.userId} (${userData.name})`)
    } catch (error: any) {
      console.error(`❌ 創建用戶 ${userData.userId} 失敗:`, error.message)
    }
  }

  console.log('\n✨ 測試用戶創建完成！')
  console.log('\n📝 登入資訊：')
  console.log('   用戶 A: User ID = userA, Name = User A')
  console.log('   用戶 B: User ID = userB, Name = User B')
  console.log('   用戶 C: User ID = userC, Name = User C')
  console.log('\n💡 提示：')
  console.log('   1. 訪問 http://localhost:3000/auth/local')
  console.log('   2. 使用上述 User ID 和 Name 登入')
  console.log('   3. 建議在不同標籤頁使用不同用戶測試')
}

createTestUsers()
  .catch((e) => {
    console.error('❌ 錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

