/**
 * Vincula un usuario a la org demo del organigrama, anotando el org_id
 * y rol original para poder revertir. Idempotente.
 *
 * Uso:
 *   npx tsx scripts/link-user-to-demo-org.ts <email> demo                              → vincula a org demo (mantiene rol)
 *   npx tsx scripts/link-user-to-demo-org.ts <email> demo-with-owner                   → vincula a org demo + baja rol a OWNER (para acceder al dashboard si eras SUPER_ADMIN)
 *   npx tsx scripts/link-user-to-demo-org.ts <email> revert <originalOrgId> [<role>]   → revierte org_id (y rol opcional)
 *   npx tsx scripts/link-user-to-demo-org.ts <email> set-role <ROLE>                   → solo cambia rol (OWNER, ADMIN, MEMBER, VIEWER, WORKER, SUPER_ADMIN)
 */

import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.argv[2]
  const action = process.argv[3] ?? 'demo'
  const targetOrgId = process.argv[4]

  if (!email) {
    console.error('❌ Falta email. Uso: npx tsx scripts/link-user-to-demo-org.ts <email> [demo|revert <orgId>]')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, orgId: true, role: true, firstName: true, lastName: true },
  })

  if (!user) {
    console.error(`❌ No existe usuario con email ${email}`)
    process.exit(1)
  }

  console.log(`👤 Usuario: ${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`)
  console.log(`   Rol: ${user.role}`)
  console.log(`   org_id ACTUAL: ${user.orgId ?? '(null)'}`)

  if (action === 'revert') {
    if (!targetOrgId) {
      console.error('❌ Para revert necesitas pasar el org_id original')
      process.exit(1)
    }
    const originalRole = process.argv[5] // opcional
    await prisma.user.update({
      where: { id: user.id },
      data: {
        orgId: targetOrgId,
        ...(originalRole ? { role: originalRole as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'WORKER' | 'SUPER_ADMIN' } : {}),
      },
    })
    console.log(`\n✅ Usuario ${email} revertido a org_id ${targetOrgId}${originalRole ? ` y rol ${originalRole}` : ''}`)
    return
  }

  if (action === 'set-role') {
    const newRole = process.argv[4]
    if (!newRole) {
      console.error('❌ Para set-role necesitas pasar el rol nuevo (OWNER, ADMIN, MEMBER, VIEWER, WORKER, SUPER_ADMIN)')
      process.exit(1)
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { role: newRole as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'WORKER' | 'SUPER_ADMIN' },
    })
    console.log(`\n✅ Usuario ${email} cambiado de rol ${user.role} → ${newRole}`)
    console.log(`\n📌 GUARDA tu rol anterior para revertir:\n   npx tsx scripts/link-user-to-demo-org.ts ${email} set-role ${user.role}`)
    return
  }

  // Buscar la org demo
  const demoOrg = await prisma.organization.findFirst({
    where: { name: { contains: 'Demo Organigrama', mode: 'insensitive' } },
    select: { id: true, name: true, plan: true },
  })

  if (!demoOrg) {
    console.error('❌ No existe la org demo. Corre primero: npx tsx scripts/seed-orgchart-demo.ts')
    process.exit(1)
  }

  const originalOrgId = user.orgId

  if (originalOrgId === demoOrg.id) {
    console.log(`\nℹ️  Tu usuario YA está vinculado a la org demo. Nada que hacer.`)
    return
  }

  const lowerRole = action === 'demo-with-owner' && user.role === 'SUPER_ADMIN'
  const originalRole = user.role

  await prisma.user.update({
    where: { id: user.id },
    data: {
      orgId: demoOrg.id,
      ...(lowerRole ? { role: 'OWNER' as const } : {}),
    },
  })

  console.log(`\n✅ Usuario ${email} vinculado a "${demoOrg.name}" (${demoOrg.plan})`)
  console.log(`   org_id ANTERIOR: ${originalOrgId ?? '(null)'}`)
  console.log(`   org_id NUEVO:    ${demoOrg.id}`)
  if (lowerRole) {
    console.log(`   rol ANTERIOR:    ${originalRole}`)
    console.log(`   rol NUEVO:       OWNER (temporal para poder acceder al dashboard)`)
  }
  console.log(`\n📌 GUARDA ESTE comando para revertir todo cuando termines:`)
  console.log(`\n   npx tsx scripts/link-user-to-demo-org.ts ${email} revert ${originalOrgId ?? 'NULL'}${lowerRole ? ` ${originalRole}` : ''}`)
  console.log(`\n💡 Ahora abre http://localhost:3000/dashboard/organigrama`)
}

main()
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
