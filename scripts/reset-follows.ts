import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Resetting all follow relationships...')
  
  // Delete all follow records
  const result = await prisma.follow.deleteMany({})
  
  console.log(`✅ Deleted ${result.count} follow relationship(s)`)
  console.log('📊 Database is now clean. You can test follow functionality from scratch.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

