import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log('1. Marcando 20260504183000_attendance_qr_sessions_work_date como aplicada...')
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "_prisma_migrations"
    SET finished_at = NOW(), logs = NULL, rolled_back_at = NULL
    WHERE migration_name = '20260504183000_attendance_qr_sessions_work_date'
      AND finished_at IS NULL
  `)
  console.log(`   ✓ ${updated} row(s) updated`)

  console.log('\n2. Aplicando 20260507120000_audit_remediation_schema...')
  console.log('   - workers.org_id: Cascade → Restrict')
  await prisma.$executeRawUnsafe(`ALTER TABLE "workers" DROP CONSTRAINT IF EXISTS "workers_org_id_fkey"`)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "workers"
      ADD CONSTRAINT "workers_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  `)
  console.log('     ✓ FK reescrito')

  console.log('   - ai_usage.eval_score: DOUBLE PRECISION → DECIMAL(5,4)')
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ai_usage"
      ALTER COLUMN "eval_score" TYPE DECIMAL(5,4)
      USING ("eval_score"::DECIMAL(5,4))
  `)
  console.log('     ✓ Column type changed')

  console.log('\n3. Registrando migration en _prisma_migrations...')
  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (
      gen_random_uuid()::text,
      'manual-applied-' || extract(epoch from now())::text,
      NOW(),
      '20260507120000_audit_remediation_schema',
      NULL,
      NULL,
      NOW(),
      1
    )
    ON CONFLICT (migration_name) DO NOTHING
  `).catch(async (err) => {
    // Si la tabla no tiene unique constraint en migration_name, hago workaround
    console.log('   (no unique constraint, insertando si no existe...)')
    const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "_prisma_migrations"
      WHERE migration_name = '20260507120000_audit_remediation_schema'
    `
    if (Number(exists[0].count) === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (
          gen_random_uuid()::text,
          'manual-applied-' || extract(epoch from now())::text,
          NOW(),
          '20260507120000_audit_remediation_schema',
          NULL,
          NULL,
          NOW(),
          1
        )
      `)
    }
  })
  console.log('   ✓ Registered')

  console.log('\n4. Verificación final...')
  const fkCheck = await prisma.$queryRaw<Array<{ def: string }>>`
    SELECT pg_catalog.pg_get_constraintdef(c.oid) as def
    FROM pg_catalog.pg_constraint c
    WHERE c.conname = 'workers_org_id_fkey'
  `
  console.log(`   workers_org_id_fkey: ${fkCheck[0]?.def}`)

  const colCheck = await prisma.$queryRaw<Array<{ data_type: string; numeric_precision: number | null; numeric_scale: number | null }>>`
    SELECT data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name='ai_usage' AND column_name='eval_score'
  `
  console.log(`   ai_usage.eval_score: ${JSON.stringify(colCheck[0])}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
