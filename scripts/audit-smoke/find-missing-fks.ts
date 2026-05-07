/**
 * Encuentra tablas que tienen columna `org_id` pero NO tienen una FK
 * apuntando a organizations(id). Output autoritativo basado en estado
 * real de la DB (no del schema.prisma que puede tener drift).
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  // Tablas con columna org_id
  const tablesWithOrgId = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE column_name = 'org_id'
      AND table_schema = 'public'
    ORDER BY table_name
  `

  // Tablas que ya tienen FK a organizations(id)
  const tablesWithFk = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT DISTINCT tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'org_id'
      AND ccu.table_name = 'organizations'
  `

  const fkSet = new Set(tablesWithFk.map((r) => r.table_name))
  const missing = tablesWithOrgId.filter((r) => !fkSet.has(r.table_name))

  console.log(`Total tablas con org_id: ${tablesWithOrgId.length}`)
  console.log(`Tablas con FK a organizations(id): ${tablesWithFk.length}`)
  console.log(`\n⚠️  Tablas SIN FK (huérfanas a nivel DB): ${missing.length}\n`)
  for (const t of missing) {
    // Para cada una, contar filas + verificar nullable
    const colInfo = await prisma.$queryRawUnsafe<Array<{ is_nullable: string }>>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = '${t.table_name}' AND column_name = 'org_id'`
    )
    const nullable = colInfo[0]?.is_nullable === 'YES'
    const cnt = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${t.table_name}"`
    )
    console.log(`  - ${t.table_name} (rows: ${Number(cnt[0].count)}, nullable: ${nullable})`)
  }

  // Verificar que no haya orgIds huérfanos en las tablas missing
  console.log('\nValidando referencias huérfanas...')
  let totalOrphans = 0
  for (const t of missing) {
    try {
      const orphans = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${t.table_name}" t
         WHERE t.org_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = t.org_id)`
      )
      const n = Number(orphans[0].count)
      if (n > 0) {
        totalOrphans += n
        console.log(`  ⚠️  ${t.table_name}: ${n} filas con orgId huérfano`)
      }
    } catch {
      // ignore
    }
  }
  console.log(`\nTotal filas huérfanas: ${totalOrphans}`)

  // Output JSON
  const out = missing.map((m) => m.table_name)
  require('node:fs').writeFileSync(
    require('node:path').join(__dirname, 'missing-fks.json'),
    JSON.stringify(out, null, 2)
  )
  console.log(`\nGuardado: missing-fks.json (${out.length} tablas)`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
