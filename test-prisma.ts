import { prisma } from './lib/prisma'

async function testConnection() {
  try {
    console.log('Testing Prisma connection...')
    const count = await prisma.user.count()
    console.log(`✓ Connected! Found ${count} users in database`)
    process.exit(0)
  } catch (error) {
    console.error('✗ Connection failed:', error)
    process.exit(1)
  }
}

testConnection()
