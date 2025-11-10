/**
 * MongoDB 索引修复脚本
 * 
 * 此脚本用于修复 MongoDB 数据库中的旧索引问题。
 * 删除旧的 email 唯一索引，创建新的 [email, provider] 复合唯一索引。
 * 
 * 使用方法：
 * 1. 确保 DATABASE_URL 环境变量已设置
 * 2. 运行: node scripts/fix-mongodb-indexes.js
 * 
 * 或者直接在 MongoDB Shell 中运行：
 * mongosh "your-connection-string" --eval "load('scripts/fix-mongodb-indexes.js')"
 */

const { MongoClient } = require('mongodb')

async function fixMongoDBIndexes() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ 错误：未设置 DATABASE_URL 环境变量')
    console.log('')
    console.log('请设置 DATABASE_URL 环境变量，例如：')
    console.log('export DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/database"')
    process.exit(1)
  }

  let client
  
  try {
    console.log('🔌 连接到 MongoDB...')
    client = new MongoClient(databaseUrl)
    await client.connect()
    console.log('✓ 连接成功')
    console.log('')
    
    // 从连接字符串中提取数据库名
    const dbName = new URL(databaseUrl).pathname.slice(1) || 'test'
    const db = client.db(dbName)
    const collection = db.collection('users')
    
    console.log(`📋 当前索引列表（数据库: ${dbName}，集合: users）：`)
    const indexes = await collection.indexes()
    indexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''}`)
    })
    console.log('')
    
    // 检查是否存在旧的 email 唯一索引
    const oldEmailIndex = indexes.find((idx) => 
      idx.name === 'users_email_key' || 
      idx.name === 'email_1' ||
      (idx.key && idx.key.email === 1 && !idx.key.provider && idx.unique)
    )
    
    if (oldEmailIndex) {
      console.log(`⚠️  发现旧的 email 唯一索引: ${oldEmailIndex.name}`)
      console.log('   这个索引会阻止相同 email 但不同 provider 的用户创建')
      console.log('')
      console.log('🗑️  删除旧索引...')
      try {
        await collection.dropIndex(oldEmailIndex.name)
        console.log(`✓ 已删除索引: ${oldEmailIndex.name}`)
        console.log('')
      } catch (error) {
        console.error(`❌ 删除索引失败: ${error.message}`)
        console.log('   请手动删除此索引')
        console.log('')
      }
    } else {
      console.log('✓ 未发现旧的 email 唯一索引')
      console.log('')
    }
    
    // 检查是否存在新的复合唯一索引
    const compositeIndex = indexes.find((idx) => 
      idx.key && idx.key.email === 1 && idx.key.provider === 1 && idx.unique
    )
    
    if (compositeIndex) {
      console.log(`✓ 发现复合唯一索引: ${compositeIndex.name}`)
      console.log('   这个索引允许相同 email 但不同 provider 的用户')
      console.log('')
    } else {
      console.log('⚠️  未发现复合唯一索引 [email, provider]')
      console.log('   需要创建此索引以支持新的约束')
      console.log('')
      console.log('🔨 创建新的复合唯一索引...')
      try {
        await collection.createIndex(
          { email: 1, provider: 1 },
          { unique: true, name: 'users_email_provider_key' }
        )
        console.log('✓ 已创建复合唯一索引: users_email_provider_key')
        console.log('')
      } catch (error) {
        console.error(`❌ 创建索引失败: ${error.message}`)
        console.log('   请手动创建此索引')
        console.log('')
      }
    }
    
    console.log('📋 最终索引列表：')
    const finalIndexes = await collection.indexes()
    finalIndexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''}`)
    })
    
    console.log('')
    console.log('✅ 索引修复完成')
    
  } catch (error) {
    console.error('❌ 修复索引时出错:', error)
    console.log('')
    console.log('📝 手动修复步骤：')
    console.log('1. 连接到 MongoDB 数据库')
    console.log('2. 选择数据库')
    console.log('3. 运行以下命令：')
    console.log('   db.users.dropIndex("users_email_key")')
    console.log('   db.users.createIndex({ email: 1, provider: 1 }, { unique: true, name: "users_email_provider_key" })')
  } finally {
    if (client) {
      await client.close()
      console.log('')
      console.log('🔌 已断开 MongoDB 连接')
    }
  }
}

// 运行脚本
fixMongoDBIndexes()
  .then(() => {
    console.log('')
    console.log('✨ 脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })

