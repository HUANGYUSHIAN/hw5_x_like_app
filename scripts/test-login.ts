/**
 * 登入測試腳本
 * 
 * 測試本地認證功能
 * 
 * 使用方法：
 *   npx tsx scripts/test-login.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testLogin() {
  console.log('🧪 開始測試登入功能...\n')

  const testUser = {
    userId: 'testuser',
    name: 'Test User',
  }

  try {
    // 1. 測試用戶是否存在
    console.log('1. 檢查測試用戶是否存在...')
    let user = await prisma.user.findUnique({
      where: { userId: testUser.userId },
    })

    if (!user) {
      console.log('   用戶不存在，創建新用戶...')
      user = await prisma.user.create({
        data: {
          userId: testUser.userId,
          name: testUser.name,
          email: 'test@example.com',
          provider: 'local',
          providerId: `local-${testUser.userId}`,
        },
      })
      console.log('   ✅ 用戶創建成功')
    } else {
      console.log('   ✅ 用戶已存在')
    }

    // 2. 測試 API 登入端點
    console.log('\n2. 測試 API 登入端點...')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const loginUrl = `${baseUrl}/api/auth/local`

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUser.userId,
        name: testUser.name,
      }),
    })

    console.log(`   狀態碼: ${response.status}`)
    const data = await response.json()
    console.log(`   回應:`, JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('   ✅ 登入 API 調用成功')
    } else {
      console.log('   ❌ 登入 API 調用失敗')
    }

    // 3. 測試 Session API
    console.log('\n3. 測試 Session API...')
    const sessionUrl = `${baseUrl}/api/auth/session`
    const sessionResponse = await fetch(sessionUrl, {
      method: 'GET',
      headers: {
        'Cookie': response.headers.get('Set-Cookie') || '',
      },
    })

    console.log(`   狀態碼: ${sessionResponse.status}`)
    const sessionData = await sessionResponse.json()
    console.log(`   回應:`, JSON.stringify(sessionData, null, 2))

    if (sessionResponse.ok) {
      console.log('   ✅ Session API 調用成功')
    } else {
      console.log('   ❌ Session API 調用失敗')
    }

    // 4. 測試 Providers API
    console.log('\n4. 測試 Providers API...')
    const providersUrl = `${baseUrl}/api/auth/providers`
    const providersResponse = await fetch(providersUrl)

    console.log(`   狀態碼: ${providersResponse.status}`)
    if (providersResponse.ok) {
      const providersData = await providersResponse.json()
      console.log(`   回應:`, JSON.stringify(providersData, null, 2))
      console.log('   ✅ Providers API 調用成功')
    } else {
      const errorText = await providersResponse.text()
      console.log(`   錯誤: ${errorText}`)
      console.log('   ❌ Providers API 調用失敗')
    }

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()









