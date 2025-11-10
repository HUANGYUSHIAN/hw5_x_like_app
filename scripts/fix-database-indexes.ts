/**
 * 修复数据库索引脚本
 * 
 * 此脚本用于修复 MongoDB 数据库中的旧索引问题。
 * 当 Prisma schema 从 `@@unique([email])` 更新为 `@@unique([email, provider])` 时，
 * 数据库中可能还存在旧的 `email` 唯一索引，需要手动删除。
 * 
 * 使用方法：
 * 1. 确保 DATABASE_URL 环境变量已设置
 * 2. 运行: npx tsx scripts/fix-database-indexes.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDatabaseIndexes() {
  console.log('🔧 开始修复数据库索引...')
  console.log('')
  
  try {
    // 注意：Prisma 不直接支持 MongoDB 索引操作
    // 需要使用 MongoDB 原生客户端来操作索引
    
    // 获取 MongoDB 连接
    const mongoClient = (prisma as any).$connect ? await (prisma as any).$connect() : null
    
    if (!mongoClient) {
      console.error('❌ 无法获取 MongoDB 客户端')
      console.log('')
      console.log('📝 手动修复步骤：')
      console.log('1. 连接到 MongoDB 数据库')
      console.log('2. 选择数据库（通常是你的 DATABASE_URL 中的数据库名）')
      console.log('3. 运行以下命令删除旧的 email 唯一索引：')
      console.log('   db.users.dropIndex("email_1")')
      console.log('   db.users.dropIndex("users_email_key")')
      console.log('4. 确认新的复合唯一索引存在：')
      console.log('   db.users.getIndexes()')
      console.log('   应该看到类似 "email_1_provider_1" 的索引')
      console.log('')
      console.log('或者使用 MongoDB Compass 或 Atlas UI 来管理索引')
      return
    }
    
    // 使用 MongoDB 原生客户端操作索引
    const db = mongoClient.db()
    const collection = db.collection('users')
    
    console.log('📋 当前索引列表：')
    const indexes = await collection.indexes()
    indexes.forEach((index: any) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    console.log('')
    
    // 检查是否存在旧的 email 唯一索引
    const oldEmailIndex = indexes.find((idx: any) => 
      idx.name === 'email_1' || 
      idx.name === 'users_email_key' ||
      (idx.key && idx.key.email === 1 && !idx.key.provider)
    )
    
    if (oldEmailIndex) {
      console.log(`⚠️  发现旧的 email 唯一索引: ${oldEmailIndex.name}`)
      console.log('   这个索引会阻止相同 email 但不同 provider 的用户创建')
      console.log('')
      console.log('🗑️  删除旧索引...')
      try {
        await collection.dropIndex(oldEmailIndex.name)
        console.log(`✓ 已删除索引: ${oldEmailIndex.name}`)
      } catch (error: any) {
        console.error(`❌ 删除索引失败: ${error.message}`)
        console.log('   请手动删除此索引')
      }
      console.log('')
    } else {
      console.log('✓ 未发现旧的 email 唯一索引')
      console.log('')
    }
    
    // 检查是否存在新的复合唯一索引
    const compositeIndex = indexes.find((idx: any) => 
      idx.key && idx.key.email === 1 && idx.key.provider === 1
    )
    
    if (compositeIndex) {
      console.log(`✓ 发现复合唯一索引: ${compositeIndex.name}`)
      console.log('   这个索引允许相同 email 但不同 provider 的用户')
    } else {
      console.log('⚠️  未发现复合唯一索引 [email, provider]')
      console.log('   需要创建此索引以支持新的约束')
      console.log('')
      console.log('📝 手动创建索引步骤：')
      console.log('   在 MongoDB shell 中运行：')
      console.log('   db.users.createIndex({ email: 1, provider: 1 }, { unique: true })')
      console.log('')
    }
    
    console.log('')
    console.log('📋 最终索引列表：')
    const finalIndexes = await collection.indexes()
    finalIndexes.forEach((index: any) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log('')
    console.log('✅ 索引修复完成')
    
  } catch (error: any) {
    console.error('❌ 修复索引时出错:', error)
    console.log('')
    console.log('📝 手动修复步骤：')
    console.log('1. 连接到 MongoDB 数据库')
    console.log('2. 选择数据库')
    console.log('3. 运行以下命令：')
    console.log('   db.users.dropIndex("email_1")')
    console.log('   db.users.dropIndex("users_email_key")')
    console.log('   db.users.createIndex({ email: 1, provider: 1 }, { unique: true })')
  } finally {
    await prisma.$disconnect()
  }
}

// 运行脚本
fixDatabaseIndexes()
  .then(() => {
    console.log('')
    console.log('✨ 脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })

