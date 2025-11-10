/**
 * Advanced MongoDB + Network Diagnostic Script
 * Run with: npx tsx scripts/check-network-and-db.ts
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient({ log: ['error', 'warn'] })

async function checkNetwork() {
  console.log('🌐 Checking basic network connectivity...\n')
  const host = 'cluster0.h5tsiuv.mongodb.net'
  const port = 27017

  try {
    console.log(`🔎 Resolving DNS for ${host}...`)
    const dnsResult = execSync(`nslookup ${host}`).toString()
    console.log('✅ DNS resolution OK:\n', dnsResult.split('\n').slice(0, 5).join('\n'))
  } catch {
    console.error('❌ DNS resolution failed — likely DNS or firewall issue.')
  }

  try {
    console.log(`\n🔎 Testing TCP connection to ${host}:${port} ...`)
    // Windows 用 Test-NetConnection，Unix/mac 用 nc
    const command =
      process.platform === 'win32'
        ? `powershell -Command "Test-NetConnection -ComputerName ${host} -Port ${port}"`
        : `nc -vz ${host} ${port}`
    const result = execSync(command).toString()
    console.log('✅ TCP connection test OK:\n', result.split('\n').slice(0, 5).join('\n'))
  } catch {
    console.error('❌ Cannot reach MongoDB port 27017 — likely blocked by firewall.\n')
    console.error('💡 Try switching to personal hotspot or VPN.')
  }
}

async function checkDB() {
  console.log('\n🧩 Checking MongoDB connection through Prisma...\n')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set. Please add it to your .env file.')
    process.exit(1)
  }

  try {
    await prisma.$connect()
    console.log('✅ MongoDB connected successfully!')
    const userCount = await prisma.user.count()
    console.log(`✅ Database query succeeded (${userCount} users found).`)
  } catch (err: any) {
    console.error('❌ MongoDB connection failed:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('=== MongoDB + Network Diagnostic Tool ===\n')
  await checkNetwork()
  await checkDB()
  console.log('\n✅ Diagnostic complete.')
}

main()
