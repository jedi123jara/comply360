/**
 * Verifica si las queries normales (sin set app.current_org_id) siguen
 * funcionando con FORCE RLS. Si el rol Prisma tiene BYPASSRLS o es el
 * owner, debería seguir funcionando. Si no, las queries devolverán 0
 * filas (lo cual rompería la app inmediatamente).
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  // Info del rol actual
  const role = await prisma.$queryRaw<Array<{ user: string; bypassrls: boolean; superuser: boolean }>>`
    SELECT current_user as user, r.rolbypassrls as bypassrls, r.rolsuper as superuser
    FROM pg_roles r WHERE r.rolname = current_user
  `
  console.log('Conectado como:', role[0])

  // Probar query a una tabla con RLS habilitado SIN setear current_org_id
  const aiCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count FROM ai_usage
  `
  console.log(`\nai_usage rows visible (sin set current_org_id): ${Number(aiCount[0].count)}`)

  const workerAlerts = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count FROM worker_alerts
  `
  console.log(`worker_alerts rows visible: ${Number(workerAlerts[0].count)}`)

  const attendance = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count FROM attendance
  `
  console.log(`attendance rows visible: ${Number(attendance[0].count)}`)

  // Comparación con el conteo via Prisma model (que va con RLS)
  const aiUsageViaPrisma = await prisma.aiUsage.count()
  console.log(`\nai_usage via prisma.count(): ${aiUsageViaPrisma}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
