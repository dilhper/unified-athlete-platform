import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

async function main() {
  const password = 'password123'
  const passwordHash = await hash(password, 10)

  const users = [
    {
      email: 'athlete@test.local',
      name: 'Test Athlete',
      role: 'athlete',
      sport: 'Football',
    },
    {
      email: 'coach@test.local',
      name: 'Test Coach',
      role: 'coach',
      sport: 'Basketball',
      specialization: 'Skills Training',
    },
    {
      email: 'specialist@test.local',
      name: 'Test Specialist',
      role: 'specialist',
      specialization: 'Physiotherapy',
    },
    {
      email: 'official@test.local',
      name: 'Test Official',
      role: 'official',
    },
  ] as const

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        certifications: [],
        sport: 'sport' in user ? user.sport : undefined,
        specialization: 'specialization' in user ? user.specialization : undefined,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        certifications: [],
        sport: 'sport' in user ? user.sport : undefined,
        specialization: 'specialization' in user ? user.specialization : undefined,
      },
    })
  }

  console.log('Created/updated test users with password:', password)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
