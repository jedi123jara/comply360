import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  console.log('Checking duplicates in attendance(org_id, worker_id, work_date)...')

  const dups = await prisma.$queryRaw<Array<{
    org_id: string
    worker_id: string
    work_date: Date
    count: bigint
  }>>`
    SELECT org_id, worker_id, work_date, COUNT(*) as count
    FROM attendance
    WHERE work_date IS NOT NULL
    GROUP BY org_id, worker_id, work_date
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `
  console.log(`Found ${dups.length} duplicate groups (top 20):`)
  console.log(dups.map(d => ({ ...d, count: Number(d.count) })))

  // Si todos son test data, dedup keeping the latest by clock_in
  const totalDups = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total
    FROM attendance a
    WHERE EXISTS (
      SELECT 1 FROM attendance b
      WHERE b.org_id = a.org_id
        AND b.worker_id = a.worker_id
        AND b.work_date = a.work_date
        AND b.id != a.id
        AND (b.clock_in > a.clock_in OR (b.clock_in = a.clock_in AND b.id > a.id))
    )
  `
  console.log(`Total rows that would be deleted: ${Number(totalDups[0].total)}`)

  console.log('Deleting duplicates (keeping latest by clock_in then id)...')
  const result = await prisma.$executeRawUnsafe(`
    DELETE FROM attendance a
    USING attendance b
    WHERE a.org_id = b.org_id
      AND a.worker_id = b.worker_id
      AND a.work_date = b.work_date
      AND a.id != b.id
      AND (b.clock_in > a.clock_in OR (b.clock_in = a.clock_in AND b.id > a.id))
  `)
  console.log(`✓ Deleted ${result} duplicate attendance rows`)

  // Ahora SI crear el unique index
  console.log('Creating UNIQUE INDEX...')
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "attendance_org_id_worker_id_work_date_key"
      ON "attendance"("org_id", "worker_id", "work_date")
  `)
  console.log('✓ Unique index created')

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
