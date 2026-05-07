/**
 * Encuentra tablas con `org_id` que NO tienen policy RLS aplicada.
 * Las policies viven en pg_catalog.pg_policies.
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  // Tablas con org_id (tenant-scoped)
  const tenantTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE column_name = 'org_id'
      AND table_schema = 'public'
    ORDER BY table_name
  `

  // Tablas con RLS habilitado
  const rlsEnabled = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = true
  `

  // Tablas con al menos una policy
  const withPolicies = await prisma.$queryRaw<Array<{ tablename: string; count: bigint }>>`
    SELECT tablename, COUNT(*)::bigint as count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  `

  const rlsSet = new Set(rlsEnabled.map((r) => r.tablename))
  const policySet = new Set(withPolicies.map((r) => r.tablename))

  console.log(`Total tablas tenant-scoped (con org_id): ${tenantTables.length}`)
  console.log(`Tablas con RLS habilitado:               ${rlsEnabled.length}`)
  console.log(`Tablas con al menos 1 policy:            ${withPolicies.length}\n`)

  const missing = tenantTables.filter((t) => !rlsSet.has(t.table_name) || !policySet.has(t.table_name))

  console.log(`⚠️  Tablas tenant-scoped SIN RLS+policies: ${missing.length}\n`)
  for (const t of missing) {
    const hasRls = rlsSet.has(t.table_name)
    const hasPolicy = policySet.has(t.table_name)
    console.log(`  - ${t.table_name} (rls=${hasRls}, policies=${hasPolicy})`)
  }

  require('node:fs').writeFileSync(
    require('node:path').join(__dirname, 'missing-rls.json'),
    JSON.stringify(missing.map((m) => m.table_name), null, 2)
  )

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
