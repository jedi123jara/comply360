import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log('Applying #7.E audit indexes...')

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "leads_converted_org_id_idx"
      ON "leads"("converted_org_id")
  `)
  console.log('  ✓ leads_converted_org_id_idx')

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "calculations_org_id_created_at_idx"
      ON "calculations"("org_id", "created_at")
  `)
  console.log('  ✓ calculations_org_id_created_at_idx')

  // Registrar la migration en _prisma_migrations
  const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "_prisma_migrations"
    WHERE migration_name = '20260507130000_audit_indexes_and_fk'
  `
  if (Number(exists[0].count) === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid()::text,
        'manual-applied-' || extract(epoch from now())::text,
        NOW(),
        '20260507130000_audit_indexes_and_fk',
        NULL,
        NULL,
        NOW(),
        1
      )
    `)
    console.log('  ✓ Migration registrada')
  } else {
    console.log('  (migration ya registrada)')
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
