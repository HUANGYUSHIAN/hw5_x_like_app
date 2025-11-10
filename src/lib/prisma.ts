import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // MongoDB connection pool settings
    // Note: Connection timeout settings should be in DATABASE_URL:
    // ?retryWrites=true&w=majority&serverSelectionTimeoutMS=10000&connectTimeoutMS=10000
  })

// Prisma will automatically connect on first query
// Connection errors will be caught in API routes with proper error handling

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma



