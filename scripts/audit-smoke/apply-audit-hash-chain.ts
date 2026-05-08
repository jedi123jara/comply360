/**
 * Aplica las columnas prev_hash + entry_hash a audit_logs en la DB real.
 */
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log('Aplicando columns + index para AuditLog hash chain...\n')

  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "prev_hash" TEXT`)
  console.log('  ✓ prev_hash column')
  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entry_hash" TEXT`)
  console.log('  ✓ entry_hash column')
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "audit_logs_entry_hash_idx" ON "audit_logs"("entry_hash")`,
  )
  console.log('  ✓ entry_hash index')

  // Registrar migration
  const exists = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "_prisma_migrations"
    WHERE migration_name = '20260507160000_audit_log_hash_chain'
  `
  if (Number(exists[0].count) === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid()::text,
        'manual-applied-' || extract(epoch from now())::text,
        NOW(),
        '20260507160000_audit_log_hash_chain',
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

  // Stats
  const stats = await prisma.$queryRaw<Array<{ total: bigint; with_hash: bigint }>>`
    SELECT COUNT(*)::bigint as total, COUNT(entry_hash)::bigint as with_hash FROM audit_logs
  `
  console.log(
    `\nAuditLog stats: ${Number(stats[0].total)} total, ${Number(stats[0].with_hash)} con hash. ` +
      `${Number(stats[0].total) - Number(stats[0].with_hash)} legacy (verifyAuditChain las salta).`,
  )

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
