/**
 * FIX #7.C — Aplica ENABLE RLS + policy `tenant_isolation` a las 49 tablas
 * tenant-scoped sin protección.
 *
 * Política aplicada:
 *   - USING / WITH CHECK: org_id = current_setting('app.current_org_id', true)
 *   - Para columnas org_id nullable: permite NULL también.
 *
 * NOTA: estas policies SOLO se enforcan cuando RLS_ENFORCED=true en el
 * código de la app + el rol Postgres NO tiene BYPASSRLS. Hoy las apps
 * conectan con un rol que bypassa, así que esto es defensa en profundidad
 * preparada para activar en el futuro.
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

// Tablas detectadas por find-missing-rls.ts. `users` y `subscriptions` se
// excluyen porque tienen casos especiales (orgId nullable durante onboarding,
// suscripción cross-system).
const TABLES_NULLABLE_ORGID = new Set([
  'ai_usage',
  'gamification_events',
  'sunat_query_cache',
  'attendance_attempts',
  'rh_invoices',
])

const TABLES = [
  'ai_budget_counters',
  'ai_usage',
  'attendance',
  'attendance_approvals',
  'attendance_attempts',
  'attendance_evidence',
  'attendance_justifications',
  'attendance_qr_sessions',
  'bulk_contract_jobs',
  'certificates',
  'cese_records',
  'compliance_scores',
  'compliance_tasks',
  'contract_validations',
  'contract_versions',
  'document_acknowledgments',
  'enrollments',
  'gamification_events',
  'geofences',
  'inspecciones_en_vivo',
  'invitations',
  'merkle_anchors',
  'nps_feedback',
  'org_alerts',
  'org_assignments',
  'org_chart_drafts',
  'org_chart_snapshots',
  'org_compliance_roles',
  'org_compliance_seals',
  'org_documents',
  'org_positions',
  'org_structure_change_logs',
  'org_templates',
  'org_units',
  'rh_invoices',
  'scheduled_reports',
  'service_providers',
  'sindical_records',
  'sunat_query_cache',
  'terceros',
  'webhook_deliveries',
  'webhook_subscriptions',
  'worker_dependents',
  'worker_history_events',
  'worker_requests',
  'workflow_runs',
  'workflows',
]

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log(`Aplicando RLS + tenant_isolation a ${TABLES.length} tablas...\n`)

  let applied = 0
  let failed = 0

  for (const table of TABLES) {
    try {
      // 1. Habilitar RLS
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`)

      // 2. Forzar RLS también para roles owners (sin esto, el owner bypasea)
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`)

      // 3. Drop policy previa (si la hay) — idempotente
      await prisma.$executeRawUnsafe(
        `DROP POLICY IF EXISTS tenant_isolation ON "${table}"`
      )

      // 4. Crear policy. Para nullable, permitir NULL.
      const isNullable = TABLES_NULLABLE_ORGID.has(table)
      const usingClause = isNullable
        ? `(org_id IS NULL OR org_id = current_setting('app.current_org_id', true))`
        : `(org_id = current_setting('app.current_org_id', true))`

      await prisma.$executeRawUnsafe(`
        CREATE POLICY tenant_isolation ON "${table}"
          USING ${usingClause}
          WITH CHECK ${usingClause}
      `)

      console.log(`  ✓ ${table}${isNullable ? ' (nullable)' : ''}`)
      applied++
    } catch (err) {
      console.log(`  ✗ ${table}: ${(err as Error).message.slice(0, 100)}`)
      failed++
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`  RESULTADO: ${applied} aplicadas, ${failed} fallaron`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (applied > 0) {
    const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "_prisma_migrations"
      WHERE migration_name = '20260507150000_rls_policies_full'
    `
    if (Number(exists[0].count) === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
          gen_random_uuid()::text,
          'manual-applied-' || extract(epoch from now())::text,
          NOW(),
          '20260507150000_rls_policies_full',
          NULL,
          NULL,
          NOW(),
          1
        )
      `)
      console.log('  ✓ Migration registrada')
    }
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
