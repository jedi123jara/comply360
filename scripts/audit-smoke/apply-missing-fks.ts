/**
 * FIX #7.B — Aplica ALTER TABLE ADD CONSTRAINT FOREIGN KEY a organizations(id)
 * en las 32 tablas detectadas como huérfanas.
 *
 * Política:
 *   - ON DELETE RESTRICT (consistente con #7.A workers).
 *   - Para columnas nullable, mantener nullable; el FK acepta NULL.
 *   - Si la constraint ya existe, IF NOT EXISTS via DO block.
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

const TABLES = [
  'ai_budget_counters',
  'ai_usage',
  'attendance',
  'attendance_approvals',
  'attendance_attempts',
  'attendance_evidence',
  'attendance_justifications',
  'bulk_contract_jobs',
  'certificates',
  'cese_records',
  'compliance_scores',
  'contract_validations',
  'contract_versions',
  'enrollments',
  'gamification_events',
  'geofences',
  'merkle_anchors',
  'nps_feedback',
  'org_compliance_seals',
  'puestos_trabajo',
  'scheduled_reports',
  'sindical_records',
  'sst_records',
  'sunat_query_cache',
  'terceros',
  'webhook_deliveries',
  'webhook_subscriptions',
  'worker_alerts',
  'worker_dependents',
  'worker_history_events',
  'workflow_runs',
  'workflows',
]

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log(`Aplicando FKs en ${TABLES.length} tablas...\n`)
  let applied = 0
  let skipped = 0
  let failed = 0

  for (const table of TABLES) {
    const constraintName = `${table}_org_id_fkey`
    try {
      // Chequear si ya existe la constraint
      const existing = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS(
          SELECT 1 FROM pg_constraint
          WHERE conname = '${constraintName}'
        ) as exists`
      )
      if (existing[0]?.exists) {
        skipped++
        continue
      }

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${table}"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      `)
      console.log(`  ✓ ${table}`)
      applied++
    } catch (err) {
      console.log(`  ✗ ${table}: ${(err as Error).message.slice(0, 100)}`)
      failed++
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`  RESULTADO: ${applied} aplicadas, ${skipped} ya existían, ${failed} fallaron`)
  console.log('═══════════════════════════════════════════════════════════════')

  // Registrar migration
  if (applied > 0) {
    const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "_prisma_migrations"
      WHERE migration_name = '20260507140000_orphan_models_fk'
    `
    if (Number(exists[0].count) === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
          gen_random_uuid()::text,
          'manual-applied-' || extract(epoch from now())::text,
          NOW(),
          '20260507140000_orphan_models_fk',
          NULL,
          NULL,
          NOW(),
          1
        )
      `)
      console.log('  ✓ Migration 20260507140000_orphan_models_fk registrada')
    }
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
