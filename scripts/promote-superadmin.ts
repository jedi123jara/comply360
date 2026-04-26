import { prisma } from '../src/lib/prisma'

async function main() {
  const email = process.argv[2] ?? 'a.jaracarranza@gmail.com'

  const before = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      orgId: true,
      clerkId: true,
    },
  })

  if (!before) {
    console.log(`❌ No existe user con email ${email}`)
    return
  }

  console.log('ANTES:', JSON.stringify(before, null, 2))

  const after = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, role: true, orgId: true },
  })

  console.log('DESPUÉS:', JSON.stringify(after, null, 2))

  if (before.orgId) {
    await prisma.auditLog.create({
      data: {
        orgId: before.orgId,
        userId: before.id,
        action: 'ADMIN_PROMOTED',
        entityType: 'User',
        entityId: before.id,
        metadataJson: {
          email,
          previousRole: before.role,
          newRole: 'SUPER_ADMIN',
          promotedVia: 'manual_db_update',
          reason: 'founder access to /admin/*',
        },
      },
    })
    console.log('✅ AuditLog ADMIN_PROMOTED creado')
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
