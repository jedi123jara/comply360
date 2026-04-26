import { prisma } from '../src/lib/prisma'

async function main() {
  // Listar todos los users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, orgId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  console.log(`Total users: ${users.length}`)
  for (const u of users) {
    console.log(`  ${u.email}  →  role=${u.role}  org=${u.orgId ?? '(null)'}`)
  }
}

main()
  .catch((e) => {
    console.error('FULL ERROR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
