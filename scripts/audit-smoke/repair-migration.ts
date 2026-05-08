import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

/**
 * Repair migration `20260504183000_attendance_qr_sessions_work_date` que quedó
 * parcialmente aplicada: creó qr_sessions + attendance.work_date pero NO las
 * 3 tablas restantes (justifications, approvals, evidence). Aplicamos las
 * partes faltantes y marcamos la migration como `applied`.
 */
async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log('1. Aplicando tablas faltantes de migration 20260504183000...')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "attendance_justifications" (
      "id" TEXT NOT NULL,
      "attendance_id" TEXT NOT NULL,
      "org_id" TEXT NOT NULL,
      "worker_id" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "files" JSONB,
      "requested_by" TEXT NOT NULL,
      "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "attendance_justifications_pkey" PRIMARY KEY ("id")
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_justifications_org_id_worker_id_requested_at_idx"
      ON "attendance_justifications"("org_id", "worker_id", "requested_at")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_justifications_attendance_id_idx"
      ON "attendance_justifications"("attendance_id")
  `)
  // FK
  const justFk = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='attendance_justifications_attendance_id_fkey') as exists
  `
  if (!justFk[0].exists) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "attendance_justifications"
        ADD CONSTRAINT "attendance_justifications_attendance_id_fkey"
        FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "attendance_approvals" (
      "id" TEXT NOT NULL,
      "attendance_id" TEXT NOT NULL,
      "org_id" TEXT NOT NULL,
      "approved" BOOLEAN NOT NULL,
      "comment" TEXT,
      "justification_id" TEXT,
      "approved_by" TEXT NOT NULL,
      "approved_by_name" TEXT,
      "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "attendance_approvals_pkey" PRIMARY KEY ("id")
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_approvals_org_id_approved_at_idx"
      ON "attendance_approvals"("org_id", "approved_at")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_approvals_attendance_id_idx"
      ON "attendance_approvals"("attendance_id")
  `)
  const apprFk = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='attendance_approvals_attendance_id_fkey') as exists
  `
  if (!apprFk[0].exists) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "attendance_approvals"
        ADD CONSTRAINT "attendance_approvals_attendance_id_fkey"
        FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "attendance_evidence" (
      "id" TEXT NOT NULL,
      "attendance_id" TEXT NOT NULL,
      "org_id" TEXT NOT NULL,
      "worker_id" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "value" TEXT,
      "metadata_json" JSONB,
      "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "attendance_evidence_pkey" PRIMARY KEY ("id")
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_evidence_org_id_worker_id_captured_at_idx"
      ON "attendance_evidence"("org_id", "worker_id", "captured_at")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_evidence_attendance_id_idx"
      ON "attendance_evidence"("attendance_id")
  `)
  const evidFk = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='attendance_evidence_attendance_id_fkey') as exists
  `
  if (!evidFk[0].exists) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "attendance_evidence"
        ADD CONSTRAINT "attendance_evidence_attendance_id_fkey"
        FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
  }

  // Index únicos de attendance.work_date
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "attendance_org_id_worker_id_work_date_idx"
      ON "attendance"("org_id", "worker_id", "work_date")
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "attendance_org_id_worker_id_work_date_key"
      ON "attendance"("org_id", "worker_id", "work_date")
  `)

  console.log('   ✓ Tablas y constraints creados.')

  console.log('2. Marcando migration 20260504183000 como aplicada en _prisma_migrations...')
  await prisma.$executeRawUnsafe(`
    UPDATE "_prisma_migrations"
    SET finished_at = NOW(), logs = NULL, rolled_back_at = NULL
    WHERE migration_name = '20260504183000_attendance_qr_sessions_work_date'
  `)
  console.log('   ✓ Migration marcada como completada.')

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
