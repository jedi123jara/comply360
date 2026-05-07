/**
 * Para cada modelo "huérfano" (orgId sin FK a Organization), cuenta filas
 * cuyo orgId NO existe en organizations. Si hay > 0, tenemos que limpiar
 * antes de aplicar la FK.
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

const TABLES_TO_CHECK = [
  // Tabla, columna orgId, ¿es nullable?
  ['integration_credentials', 'org_id', false],
  ['users', 'org_id', false],
  ['gamification_events', 'org_id', true],
  ['worker_alerts', 'org_id', false],
  ['worker_dependents', 'org_id', false],
  ['worker_history_events', 'org_id', false],
  ['contract_validations', 'org_id', false],
  ['merkle_anchors', 'org_id', false],
  ['bulk_contract_jobs', 'org_id', false],
  ['contract_versions', 'org_id', false],
  ['calculations', 'org_id', true],
  ['compliance_diagnostics', 'org_id', false],
  ['compliance_scores', 'org_id', false],
  ['sst_records', 'org_id', false],
  ['enrollments', 'org_id', false],
  ['certificates', 'org_id', false],
  ['cese_records', 'org_id', false],
  ['terceros', 'org_id', false],
  ['sindical_records', 'org_id', false],
  ['nps_feedback', 'org_id', true],
  ['attendance', 'org_id', false],
  ['geofences', 'org_id', false],
  ['attendance_justifications', 'org_id', false],
  ['attendance_approvals', 'org_id', false],
  ['attendance_evidence', 'org_id', false],
  ['attendance_attempts', 'org_id', true],
  ['org_documents', 'org_id', false],
  ['inspecciones_en_vivo', 'org_id', false],
  ['sunat_query_cache', 'org_id', false],
  ['workflows', 'org_id', false],
  ['scheduled_reports', 'org_id', false],
  ['workflow_runs', 'org_id', false],
  ['webhook_subscriptions', 'org_id', false],
  ['webhook_deliveries', 'org_id', false],
  ['org_compliance_seals', 'org_id', false],
  ['ai_usage', 'org_id', true],
  ['ai_budget_counters', 'org_id', false],
  ['puestos_trabajo', 'org_id', false],
  ['user_drafts', 'org_id', false],
] as const

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log(`Auditando ${TABLES_TO_CHECK.length} tablas para orgIds huérfanos...\n`)

  const issues: Array<{ table: string; orphans: number; total: number; nullable: boolean }> = []

  for (const [table, col, nullable] of TABLES_TO_CHECK) {
    try {
      const total = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${table}"`
      )
      const orphans = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${table}" t
         WHERE t."${col}" IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = t."${col}")`
      )
      const totalN = Number(total[0].count)
      const orphansN = Number(orphans[0].count)
      if (orphansN > 0) {
        issues.push({ table, orphans: orphansN, total: totalN, nullable })
        console.log(`⚠️  ${table}: ${orphansN}/${totalN} orgIds huérfanos`)
      } else {
        console.log(`✓  ${table}: ${totalN} filas, todos los orgIds válidos`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗  ${table}: query falló → ${msg.slice(0, 100)}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`  ISSUES: ${issues.length} tablas con orgIds huérfanos`)
  console.log('═══════════════════════════════════════════════════════════════')
  for (const i of issues) {
    console.log(`  ${i.table}: ${i.orphans} filas huérfanas (nullable=${i.nullable})`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
